// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set).
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const png = (c = { r: 200, g: 40, b: 40 }) => sharp({ create: { width: 120, height: 80, channels: 4, background: { ...c, alpha: 1 } } }).png().toBuffer();

describe.skipIf(!uri)("project assets (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_assets_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const project = async (name: string) => {
    const { createProject } = await import("@/lib/server/projects");
    return createProject("owner1", name);
  };

  it("a logo is stored, becomes the project's logo and a new one replaces the old one", async () => {
    const { saveAsset, listAssets, getAsset, toBuf } = await import("@/lib/server/assets");
    const { getProject, toDTO } = await import("@/lib/server/projects");
    const id = await project("L1");
    const a = await saveAsset({ projectId: id, kind: "logo", input: await png(), by: "u1" });
    expect(a).toMatchObject({ kind: "logo", width: 120, height: 80, url: `/api/assets/${a.id}` });
    expect((await getProject(id))?.logoAssetId).toBe(a.id);
    const stored = (await getAsset(a.id))!;
    expect(stored.mime).toBe("image/png");
    expect((await sharp(toBuf(stored.data)).metadata()).format).toBe("png"); // Binary read back as real bytes

    const b = await saveAsset({ projectId: id, kind: "logo", input: await png({ r: 10, g: 200, b: 30 }), by: "u1" });
    expect((await getProject(id))?.logoAssetId).toBe(b.id);
    expect(await getAsset(a.id)).toBeNull(); // the old logo is gone
    expect((await listAssets(id)).map((x) => x.id)).toEqual([b.id]);
    expect(toDTO((await getProject(id))!, {} as never).logoUrl).toBe(`/api/assets/${b.id}`);
  });

  it("references are capped per project (the oldest make room) and pending ones are remembered on the project", async () => {
    const { saveAsset, listAssets, MAX_REFS_PER_PROJECT } = await import("@/lib/server/assets");
    const { getProject } = await import("@/lib/server/projects");
    const id = await project("R1");
    const first = await saveAsset({ projectId: id, kind: "reference", input: await png(), by: "u1", pending: true });
    expect((await getProject(id))?.pendingRefs).toEqual([first.id]);
    for (let i = 0; i < MAX_REFS_PER_PROJECT + 2; i++) await saveAsset({ projectId: id, kind: "reference", input: await png(), by: "u1" });
    const all = await listAssets(id);
    expect(all).toHaveLength(MAX_REFS_PER_PROJECT);
    expect(all.find((x) => x.id === first.id)).toBeUndefined();
  });

  it("the AI only gets references of THIS project, as base64 JPEG; the logo is described", async () => {
    const { saveAsset, aiImages, logoInfo } = await import("@/lib/server/assets");
    const { getProject } = await import("@/lib/server/projects");
    const a = await project("A");
    const b = await project("B");
    const ra = await saveAsset({ projectId: a, kind: "reference", input: await png(), by: "u1" });
    const rb = await saveAsset({ projectId: b, kind: "reference", input: await png(), by: "u1" });
    const logo = await saveAsset({ projectId: a, kind: "logo", input: await png(), by: "u1" });
    const imgs = await aiImages(a, [ra.id, rb.id, logo.id, "not-an-id"]);
    expect(imgs).toHaveLength(1); // not B's reference, not the logo, not garbage
    expect(imgs[0].mediaType).toBe("image/jpeg");
    expect((await sharp(Buffer.from(imgs[0].data, "base64")).metadata()).format).toBe("jpeg");
    expect(await aiImages(a, undefined)).toEqual([]);
    expect(await logoInfo(a, (await getProject(a))?.logoAssetId)).toMatchObject({ src: `/api/assets/${logo.id}`, width: 120, height: 80, color: "#c82828" });
    expect(await logoInfo(b, (await getProject(a))?.logoAssetId)).toBeNull(); // another project's logo id does not leak
  });

  it("deleting removes the image, unsets the logo and the pending reference; wrong project cannot delete", async () => {
    const { saveAsset, deleteAsset, getAsset } = await import("@/lib/server/assets");
    const { getProject } = await import("@/lib/server/projects");
    const id = await project("D");
    const other = await project("D2");
    const logo = await saveAsset({ projectId: id, kind: "logo", input: await png(), by: "u1" });
    const ref = await saveAsset({ projectId: id, kind: "reference", input: await png(), by: "u1", pending: true });
    expect(await deleteAsset(other, logo.id)).toBe(false);
    expect(await getAsset(logo.id)).not.toBeNull();
    expect(await deleteAsset(id, logo.id)).toBe(true);
    expect(await deleteAsset(id, ref.id)).toBe(true);
    const p = (await getProject(id))!;
    expect(p.logoAssetId).toBeUndefined();
    expect(p.pendingRefs).toEqual([]);
  });

  it("staged photos: only the sender can use them; promoting makes a real asset and removes the staged copy", async () => {
    const { stageAsset, peekStaged, promoteStaged, getAsset } = await import("@/lib/server/assets");
    const id = await project("S");
    const sid = await stageAsset({ projectId: id, input: await png(), by: "u1", caption: "make it like this" });
    expect(await peekStaged(sid, "u1")).toEqual({ projectId: id, caption: "make it like this" });
    expect(await peekStaged(sid, "u2")).toBeNull();
    await expect(promoteStaged({ id: sid, kind: "logo", projectId: id, by: "u2" })).rejects.toThrow(/topilmadi/);
    const a = await promoteStaged({ id: sid, kind: "reference", projectId: id, by: "u1" });
    expect(a.kind).toBe("reference");
    expect(await getAsset(sid)).toBeNull();
    await expect(stageAsset({ projectId: id, input: Buffer.from("nope"), by: "u1" })).rejects.toThrow(/rasm emas/);
  });

  it("deleting a project removes its images", async () => {
    const { saveAsset, listAssets } = await import("@/lib/server/assets");
    const { deleteProjectCascade, getProject } = await import("@/lib/server/projects");
    const id = await project("X");
    await saveAsset({ projectId: id, kind: "reference", input: await png(), by: "u1" });
    await deleteProjectCascade((await getProject(id))! as never);
    expect(await listAssets(id)).toEqual([]);
  });
});
