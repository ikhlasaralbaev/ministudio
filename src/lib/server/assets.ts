import "server-only";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { HttpError } from "./http";
import { inspectImage, processImage, type AssetKind } from "./imaging";
import { projects } from "./projects";

/** Uploaded images of a project. "staged" = a photo received in the bot that waits for the person to say what it is. */
export interface AssetDoc {
  _id: ObjectId;
  projectId: string | null;
  kind: AssetKind | "staged";
  mime: string;
  data: Buffer;
  width: number;
  height: number;
  size: number;
  color?: string | null;
  by: string;
  /** staged photos: the caption the person wrote with it (used as the AI request) */
  caption?: string;
  createdAt: Date;
}
export interface AssetMeta {
  id: string;
  kind: AssetKind;
  url: string;
  width: number;
  height: number;
  color: string | null;
  createdAt: string;
}

export const MAX_REFS_PER_PROJECT = 8;
export const MAX_REFS_PER_REQUEST = 5;

/** The Mongo driver hands binary fields back as BSON Binary; this is the plain Buffer (honouring Binary's used length). */
export function toBuf(data: unknown): Buffer {
  const d = data as { buffer?: Uint8Array; position?: number } | Buffer;
  if (Buffer.isBuffer(d)) return d;
  if (d && d.buffer) return Buffer.from(d.buffer).subarray(0, d.position ?? d.buffer.length);
  return Buffer.alloc(0);
}

const col = async () => {
  const c = (await db()).collection<AssetDoc>("assets");
  await c.createIndex({ projectId: 1, kind: 1, createdAt: -1 });
  await c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { kind: "staged" } });
  return c;
};
export const assetUrl = (id: string | ObjectId) => `/api/assets/${String(id)}`;
const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
const meta = (a: AssetDoc & { kind: AssetKind }): AssetMeta => ({
  id: a._id.toHexString(),
  kind: a.kind,
  url: assetUrl(a._id),
  width: a.width,
  height: a.height,
  color: a.color ?? null,
  createdAt: a.createdAt.toISOString(),
});

/** Stores a processed image. A logo replaces the previous one; references beyond the cap push out the oldest. */
export async function saveAsset(o: { projectId: string; kind: AssetKind; input: Buffer; by: string; pending?: boolean }): Promise<AssetMeta> {
  const p = await processImage(o.input, o.kind);
  const c = await col();
  const _id = new ObjectId();
  await c.insertOne({ _id, projectId: o.projectId, kind: o.kind, mime: p.mime, data: p.data, width: p.width, height: p.height, size: p.data.length, color: p.color, by: o.by, createdAt: new Date() });
  const pr = await projects();
  const pid = new ObjectId(o.projectId);
  if (o.kind === "logo") {
    const old = (await pr.findOne({ _id: pid }))?.logoAssetId;
    await pr.updateOne({ _id: pid }, { $set: { logoAssetId: _id.toHexString(), updatedAt: new Date() } });
    if (old && oid(old)) await c.deleteOne({ _id: oid(old)!, projectId: o.projectId });
  } else {
    const all = await c.find({ projectId: o.projectId, kind: "reference" }, { projection: { _id: 1 } }).sort({ createdAt: -1 }).toArray();
    const extra = all.slice(MAX_REFS_PER_PROJECT);
    if (extra.length) await c.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
    if (o.pending) await pr.updateOne({ _id: pid }, { $push: { pendingRefs: _id.toHexString() } });
  }
  return meta({ _id, kind: o.kind, mime: p.mime, data: p.data, width: p.width, height: p.height, size: p.data.length, color: p.color, by: o.by, createdAt: new Date(), projectId: o.projectId });
}

export async function listAssets(projectId: string): Promise<AssetMeta[]> {
  const rows = await (await col())
    .find({ projectId, kind: { $in: ["logo", "reference"] } }, { projection: { data: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return rows.map((r) => meta(r as AssetDoc & { kind: AssetKind }));
}

export async function getAsset(id: string) {
  const _id = oid(id);
  return _id ? (await col()).findOne({ _id }) : null;
}

export async function deleteAsset(projectId: string, id: string): Promise<boolean> {
  const _id = oid(id);
  if (!_id) return false;
  const r = await (await col()).deleteOne({ _id, projectId });
  if (!r.deletedCount) return false;
  const pr = await projects();
  await pr.updateOne({ _id: new ObjectId(projectId), logoAssetId: id }, { $unset: { logoAssetId: "" } });
  await pr.updateOne({ _id: new ObjectId(projectId) }, { $pull: { pendingRefs: id } } as never);
  return true;
}

/* ---------- for the AI ---------- */

export interface AiImage {
  mediaType: "image/jpeg";
  data: string;
}

/** Reference images of THIS project (an id from another project is simply skipped), as base64 for the vision model. */
export async function aiImages(projectId: string, ids: string[] | undefined): Promise<AiImage[]> {
  const list = (ids || []).map(oid).filter((x): x is ObjectId => !!x).slice(0, MAX_REFS_PER_REQUEST);
  if (!list.length) return [];
  const rows = await (await col()).find({ _id: { $in: list }, projectId, kind: "reference" }).toArray();
  return rows.map((r) => ({ mediaType: "image/jpeg" as const, data: toBuf(r.data).toString("base64") }));
}

export interface LogoInfo {
  src: string;
  width: number;
  height: number;
  color: string | null;
}
export async function logoInfo(projectId: string, logoAssetId: string | undefined): Promise<LogoInfo | null> {
  const _id = logoAssetId ? oid(logoAssetId) : null;
  if (!_id) return null;
  const a = await (await col()).findOne({ _id, projectId, kind: "logo" }, { projection: { data: 0 } });
  return a ? { src: assetUrl(a._id), width: a.width, height: a.height, color: a.color ?? null } : null;
}

/* ---------- photos waiting in the bot ---------- */

/** Keeps a photo (validated, original bytes) until the person says whether it is a logo or a reference. */
export async function stageAsset(o: { projectId: string | null; input: Buffer; by: string; caption?: string }): Promise<string> {
  const m = await inspectImage(o.input);
  const _id = new ObjectId();
  await (await col()).insertOne({ _id, projectId: o.projectId, kind: "staged", mime: `image/${m.format}`, data: o.input, width: m.width || 0, height: m.height || 0, size: o.input.length, by: o.by, ...(o.caption ? { caption: o.caption.slice(0, 2000) } : {}), createdAt: new Date() });
  return _id.toHexString();
}

/** A staged photo's project and caption (only for the person who sent it). */
export async function peekStaged(id: string, by: string): Promise<{ projectId: string | null; caption?: string } | null> {
  const _id = oid(id);
  const s = _id ? await (await col()).findOne({ _id, kind: "staged", by }, { projection: { data: 0 } }) : null;
  return s ? { projectId: s.projectId, caption: s.caption } : null;
}

/** Turns a staged photo into a real asset of `kind` for `projectId` (and removes the staged copy). */
export async function promoteStaged(o: { id: string; kind: AssetKind; projectId: string; by: string; pending?: boolean }): Promise<AssetMeta> {
  const _id = oid(o.id);
  const c = await col();
  const s = _id ? await c.findOneAndDelete({ _id, kind: "staged", by: o.by }) : null;
  if (!s) throw new HttpError("Rasm topilmadi yoki eskirgan", 404);
  return saveAsset({ projectId: o.projectId, kind: o.kind, input: toBuf(s.data), by: o.by, pending: o.pending });
}

export async function deleteProjectAssets(projectId: string) {
  await (await col()).deleteMany({ projectId });
}
