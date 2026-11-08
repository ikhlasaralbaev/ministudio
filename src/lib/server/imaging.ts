import "server-only";
import sharp from "sharp";
import { HttpError } from "./http";

export type AssetKind = "logo" | "reference";
export const MAX_UPLOAD = 5 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export interface Processed {
  data: Buffer;
  mime: string;
  width: number;
  height: number;
  /** Dominant brand-like color (#rrggbb), null for a grayscale/blank image. */
  color: string | null;
}

/** Most frequent saturated color of an RGBA sample, ignoring transparent, near-white and near-black pixels. */
export function dominantColor(rgba: Uint8Array | Buffer): string | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const [r, g, b, a] = [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 28 || min > 235 || max < 28) continue; // gray, white or black: not a brand color
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
  if (!best) return null;
  const hex = (v: number) => Math.round(v / best!.n).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

/** Throws a clear error unless `input` is a real raster image of a supported type and size. */
export async function inspectImage(input: Buffer) {
  if (!input.length) throw new HttpError("Bo'sh fayl", 400);
  if (input.length > MAX_UPLOAD) throw new HttpError("Rasm 5 MB dan katta", 413);
  try {
    const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
    if (!meta.format || !FORMATS.has(meta.format)) throw new Error("format");
    return meta;
  } catch {
    throw new HttpError("Bu rasm emas yoki qo'llab-quvvatlanmaydi (PNG, JPG, WebP, GIF)", 415);
  }
}

/**
 * Normalizes an upload: decodes it (so only real images get through), fixes orientation, strips metadata and resizes.
 * Logos stay PNG (transparency) up to 512px; references become JPEG up to 1568px (what the AI vision model wants).
 */
export async function processImage(input: Buffer, kind: AssetKind): Promise<Processed> {
  await inspectImage(input);
  try {
    const base = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
    const out =
      kind === "logo"
        ? base.resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 })
        : base.resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });
    const sample = await sharp(data).resize(40, 40, { fit: "inside" }).ensureAlpha().raw().toBuffer();
    return { data, mime: kind === "logo" ? "image/png" : "image/jpeg", width: info.width, height: info.height, color: dominantColor(sample) };
  } catch {
    // a valid header with damaged pixel data only fails once decoding really happens
    throw new HttpError("Rasm buzilgan: uni ochib bo'lmadi", 415);
  }
}
