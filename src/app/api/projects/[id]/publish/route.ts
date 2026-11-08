import { requireProject } from "@/lib/server/access";
import { publishProject } from "@/lib/server/publish";
import { publicUrl } from "@/lib/server/projects";
import { handle, ok } from "@/lib/server/http";

export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/publish">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project, user, perms } = await requireProject(id, "update");
    return ok(await publishProject({ p: project, user, perms, base: publicUrl(req) }));
  });
}
