import { startAiJob } from "@/lib/server/aiflow";
import { requireProject } from "@/lib/server/access";
import { fail, handle, ok } from "@/lib/server/http";

export const maxDuration = 300;

/**
 * AI calls take 30-90+ s, longer than the hosting proxy's request limit (100 s). So this endpoint only starts a
 * job and answers at once with { jobId }; the work continues in this process and the client polls
 * GET /api/projects/:id/ai/:jobId (see ai/[job]/route.ts and runAi() in lib/client.ts).
 */
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/ai">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project, user, perms } = await requireProject(id, "update");
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return fail("Prompt bo'sh");
    const { jobId } = await startAiJob({
      project,
      user,
      perms,
      kind: body.mode === "generate" ? "generate" : "edit",
      prompt,
      nodeId: typeof body.nodeId === "string" ? body.nodeId : null,
      doc: body.doc,
      notify: true,
      refs: Array.isArray(body.refs) ? body.refs.filter((x: unknown): x is string => typeof x === "string").slice(0, 5) : undefined,
    });
    return ok({ jobId }, 202);
  });
}
