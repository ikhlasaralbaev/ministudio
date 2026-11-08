import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { dominantColor, MAX_UPLOAD, processImage } from "@/lib/server/imaging";
import { userContent } from "@/lib/server/ai";
import { pickImages } from "@/lib/attachFiles";

const png = (w: number, h: number, c = { r: 230, g: 90, b: 20 }) => sharp({ create: { width: w, height: h, channels: 4, background: { ...c, alpha: 1 } } }).png().toBuffer();

describe("processImage", () => {
  it("logo: PNG, fitted inside 512px, never enlarged, with its dominant color", async () => {
    const big = await processImage(await png(2000, 1000), "logo");
    expect(big.mime).toBe("image/png");
    expect([big.width, big.height]).toEqual([512, 256]);
    expect(big.color).toBe("#e65a14");
    const small = await processImage(await png(100, 80), "logo");
    expect([small.width, small.height]).toEqual([100, 80]);
  });
  it("reference: JPEG up to 1568px (the AI's sweet spot)", async () => {
    const r = await processImage(await png(4000, 3000), "reference");
    expect(r.mime).toBe("image/jpeg");
    expect(Math.max(r.width, r.height)).toBe(1568);
    expect((await sharp(r.data).metadata()).format).toBe("jpeg");
  });
  it("only real raster images get through", async () => {
    await expect(processImage(Buffer.from("hello, not an image"), "logo")).rejects.toThrow(/rasm emas/);
    await expect(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>1</script></svg>'), "logo")).rejects.toThrow(/rasm emas/);
    await expect(processImage(Buffer.alloc(0), "logo")).rejects.toThrow(/Bo'sh/);
    await expect(processImage(Buffer.alloc(MAX_UPLOAD + 1), "reference")).rejects.toThrow(/5 MB/);
  });
  it("metadata is stripped (the output is re-encoded, not the original bytes)", async () => {
    const withExif = await sharp(await png(50, 50)).withMetadata({ exif: { IFD0: { Copyright: "secret" } } }).jpeg().toBuffer();
    const out = await processImage(withExif, "reference");
    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
  });
});

describe("dominantColor", () => {
  const px = (r: number, g: number, b: number, a = 255, n = 10) => Array.from({ length: n }, () => [r, g, b, a]).flat();
  it("picks the brand-like color, ignoring white, black, gray and transparent", () => {
    expect(dominantColor(Uint8Array.from([...px(255, 255, 255, 255, 50), ...px(0, 0, 0, 255, 50), ...px(120, 120, 120, 255, 50), ...px(10, 200, 30, 0, 50), ...px(40, 100, 220, 255, 5)]))).toBe("#2864dc");
  });
  it("a grayscale or blank image has none", () => expect(dominantColor(Uint8Array.from(px(200, 200, 200, 255, 30)))).toBeNull());
});

describe("userContent (what the AI sees)", () => {
  it("is plain text without attachments", () => expect(userContent("hello")).toBe("hello"));
  it("images come first, then the text with the reference note and the logo note", () => {
    const c = userContent("make it nice", { images: [{ mediaType: "image/jpeg", data: "QUJD" }], logo: { src: "/api/assets/abc", width: 400, height: 200, color: "#e65a14" } }) as { type: string; text?: string; source?: { data: string } }[];
    expect(c[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } });
    expect(c[1].type).toBe("text");
    expect(c[1].text).toContain("make it nice");
    expect(c[1].text).toContain("REFERENCES");
    expect(c[1].text).toContain('"/api/assets/abc" (400x200, dominant color #e65a14)');
    expect(c[1].text).toContain('aspect "400/200"');
  });
  it("a logo alone stays a text message", () => {
    const c = userContent("x", { logo: { src: "/api/assets/z", width: 10, height: 10, color: null } });
    expect(typeof c).toBe("string");
    expect(c as string).toContain("/api/assets/z");
    expect(c as string).not.toContain("dominant color");
  });
});

describe("pickImages (client checks)", () => {
  const f = (type: string, size = 100) => new File([new Uint8Array(size)], "x", { type });
  it("accepts images, rejects other types, big files and too many", () => {
    expect(pickImages([f("image/png"), f("image/jpeg")], 0).ok).toHaveLength(2);
    expect(pickImages([f("application/pdf")], 0).error).toMatch(/Faqat PNG/);
    expect(pickImages([f("image/png", 6 * 1024 * 1024)], 0).error).toMatch(/5 MB/);
    const r = pickImages([f("image/png"), f("image/png")], 4);
    expect(r.ok).toHaveLength(1);
    expect(r.error).toMatch(/5 ta/);
  });
});

describe("damaged images", () => {
  it("a PNG with a good header but broken pixel data is a 415, not a server error", async () => {
    const good = await png(60, 40);
    const broken = Buffer.concat([good.subarray(0, 60), Buffer.alloc(40, 7)]); // header intact, data cut and garbled
    await expect(processImage(broken, "reference")).rejects.toMatchObject({ status: 415 });
    await expect(processImage(broken, "logo")).rejects.toMatchObject({ status: 415 });
  });
});
