import { projects, SUSPENDED_TEXT } from "@/lib/server/projects";
import { fail, handle, ok } from "@/lib/server/http";

// Public: the published app document.
export async function GET(_: Request, ctx: RouteContext<"/api/rt/[slug]">) {
  return handle(async () => {
    const { slug } = await ctx.params;
    const p = await (await projects()).findOne(
      { slug },
      { projection: { publishedDoc: 1, publishedVersion: 1, suspended: 1 } },
    );
    if (p?.suspended) return fail(SUSPENDED_TEXT, 423);
    if (!p?.publishedDoc) return fail("Ilova hali e'lon qilinmagan", 404);
    return ok({ doc: p.publishedDoc, version: p.publishedVersion });
  });
}
