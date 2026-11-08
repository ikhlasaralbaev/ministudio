import { requireProject } from "@/lib/server/access";
import { getAsset, toBuf } from "@/lib/server/assets";
import { handle } from "@/lib/server/http";

/**
 * Serves an uploaded image. Logos are public (the published mini app shows them to everyone); reference images are
 * private to people who can read the project. Ids are random and unguessable; content is served as a plain image.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/assets/[aid]">) {
  return handle(async () => {
    const { aid } = await ctx.params;
    const a = await getAsset(aid);
    if (!a || a.kind === "staged" || !a.projectId) return new Response("Not found", { status: 404 });
    if (a.kind !== "logo") await requireProject(a.projectId, "read");
    return new Response(new Uint8Array(toBuf(a.data)), {
      headers: {
        "content-type": a.mime,
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "cache-control": a.kind === "logo" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      },
    });
  });
}
