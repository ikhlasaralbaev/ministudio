import "server-only";

export const PAGE_SIZE = 50;

/** ?page (1-based) and ?q from an admin list request. */
export function listParams(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const q = (sp.get("q") || "").trim().slice(0, 100);
  return { sp, page, skip: (page - 1) * PAGE_SIZE, q };
}

/** Case-insensitive "contains" regex for user-typed search text. */
export function containsRegex(q: string) {
  return { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}
