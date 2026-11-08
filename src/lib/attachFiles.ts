// Client-side checks for images picked, pasted or dropped into a prompt (the server validates again).
export const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
export const MAX_FILE = 5 * 1024 * 1024;
export const MAX_FILES = 5;
const OK = new Set(ACCEPT.split(","));

/** Splits picked files into the usable ones and a short problem message (wrong type, too big, too many). */
export function pickImages(incoming: File[], already: number): { ok: File[]; error: string } {
  const ok: File[] = [];
  let error = "";
  for (const f of incoming) {
    if (!OK.has(f.type)) error = "Faqat PNG, JPG, WebP yoki GIF rasm";
    else if (f.size > MAX_FILE) error = "Rasm 5 MB dan katta";
    else if (already + ok.length >= MAX_FILES) error = `Ko'pi bilan ${MAX_FILES} ta rasm`;
    else ok.push(f);
  }
  return { ok, error };
}
