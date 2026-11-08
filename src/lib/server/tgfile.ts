import "server-only";
import { tgApi } from "./telegram";

/** Downloads a file a user sent to a bot (getFile, then the file URL). "too_big" above maxBytes, null when unavailable. */
export async function tgDownload(token: string, fileId: string, maxBytes: number): Promise<Buffer | "too_big" | null> {
  const f = await tgApi<{ file_path?: string; file_size?: number }>(token, "getFile", { file_id: fileId });
  if (f.file_size && f.file_size > maxBytes) return "too_big";
  if (!f.file_path) return null;
  const r = await fetch(`https://api.telegram.org/file/bot${token}/${f.file_path}`, { cache: "no-store" });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length > maxBytes ? "too_big" : buf;
}
