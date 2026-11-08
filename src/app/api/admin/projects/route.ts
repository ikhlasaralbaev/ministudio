import { requireAdmin } from "@/lib/server/access";
import { containsRegex, listParams, PAGE_SIZE } from "@/lib/server/admin";
import { projects } from "@/lib/server/projects";
import { usageTotals } from "@/lib/server/usage";
import { usersByIds } from "@/lib/server/users";
import { handle, ok } from "@/lib/server/http";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { sp, page, skip, q } = listParams(req);
    const and: Record<string, unknown>[] = [];
    if (q) and.push({ $or: [{ name: containsRegex(q) }, { slug: containsRegex(q) }] });
    if (sp.get("ownerless") === "1") and.push({ $or: [{ ownerId: null }, { ownerId: { $exists: false } }] });
    const filter = and.length ? { $and: and } : {};
    const col = await projects();
    const [list, total] = await Promise.all([
      col
        .find(filter, { projection: { history: 0, doc: 0, publishedDoc: 0, envEnc: 0 } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray(),
      col.countDocuments(filter),
    ]);
    const ids = list.map((p) => p._id.toHexString());
    const [owners, usage] = await Promise.all([
      usersByIds(list.map((p) => p.ownerId).filter((x): x is string => !!x)),
      usageTotals("projectId", ids),
    ]);
    return ok({
      page,
      total,
      items: list.map((p) => {
        const id = p._id.toHexString();
        const o = p.ownerId ? owners.get(p.ownerId) : null;
        return {
          _id: id,
          name: p.name,
          slug: p.slug,
          owner: o ? { id: o.id, email: o.email } : null,
          members: (p.members || []).length,
          publishedVersion: p.publishedVersion || 0,
          suspended: !!p.suspended,
          updatedAt: p.updatedAt,
          usage: usage.get(id) || { requests: 0, inputTokens: 0, outputTokens: 0 },
        };
      }),
    });
  });
}
