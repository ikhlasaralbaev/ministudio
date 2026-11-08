import { requireAdmin } from "@/lib/server/access";
import { listParams, PAGE_SIZE } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { handle, ok } from "@/lib/server/http";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { sp, page, skip } = listParams(req);
    const filter: Record<string, string> = {};
    const projectId = sp.get("projectId");
    const actorId = sp.get("actorId");
    if (projectId) filter.projectId = projectId;
    if (actorId) filter.actorId = actorId;
    const col = (await db()).collection("audit");
    const [items, total] = await Promise.all([
      col.find(filter).sort({ at: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
      col.countDocuments(filter),
    ]);
    return ok({ page, total, items });
  });
}
