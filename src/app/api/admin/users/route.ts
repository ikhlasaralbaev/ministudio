import { requireAdmin, isPlatformAdmin } from "@/lib/server/access";
import { containsRegex, listParams, PAGE_SIZE } from "@/lib/server/admin";
import { projects } from "@/lib/server/projects";
import { usageTotals } from "@/lib/server/usage";
import { peekCredits } from "@/lib/server/credits";
import { usersCol } from "@/lib/server/users";
import { handle, ok } from "@/lib/server/http";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { page, skip, q } = listParams(req);
    const filter = q ? { $or: [{ email: containsRegex(q) }, { name: containsRegex(q) }] } : {};
    const [list, total] = await Promise.all([
      usersCol().find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
      usersCol().countDocuments(filter),
    ]);
    const ids = list.map((u) => u._id.toHexString());
    const credits = await peekCredits(ids);
    const [counts, usage] = await Promise.all([
      (await projects())
        .aggregate<{ _id: string; n: number }>([{ $match: { ownerId: { $in: ids } } }, { $group: { _id: "$ownerId", n: { $sum: 1 } } }])
        .toArray(),
      usageTotals("userId", ids),
    ]);
    const projectCount = new Map(counts.map((c) => [c._id, c.n]));
    return ok({
      page,
      total,
      items: list.map((u) => {
        const id = u._id.toHexString();
        return {
          id,
          email: u.email,
          name: u.name,
          image: u.image ?? null,
          createdAt: u.createdAt ?? null,
          banned: !!u.banned,
          isAdmin: isPlatformAdmin(u.email),
          projects: projectCount.get(id) || 0,
          credits: credits.get(id) ?? null,
          usage: usage.get(id) || { requests: 0, inputTokens: 0, outputTokens: 0 },
        };
      }),
    });
  });
}
