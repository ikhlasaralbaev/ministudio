import { requireProject } from "@/lib/server/access";
import { promptHistory } from "@/lib/server/usage";
import { handle, ok } from "@/lib/server/http";

/** Prompt history of a project (newest first): what was asked, by whom, with which model, tokens, time and result. */
export async function GET(_: Request, ctx: RouteContext<"/api/projects/[id]/prompts">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireProject(id, "read");
    const items = await promptHistory(id);
    return ok({ items: items.map(({ _id, ...r }) => ({ id: String(_id), ...r })) });
  });
}
