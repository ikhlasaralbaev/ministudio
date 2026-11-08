import { requireProject } from "@/lib/server/access";
import { listAssets, saveAsset } from "@/lib/server/assets";
import { MAX_UPLOAD } from "@/lib/server/imaging";
import { rateLimited } from "@/lib/server/runtime";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: the project's logo and reference images (metadata only). */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/assets">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireProject(id, "read");
    return ok({ items: await listAssets(id) });
  });
}

/** POST multipart: file + kind ("logo" | "reference") [+ pending=1: keep it for the project's first generation]. */
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/assets">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { user } = await requireProject(id, "update");
    if (rateLimited(`upload:${user.id}`, 30)) return fail("Juda ko'p yuklash, birozdan keyin urinib ko'ring", 429);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    const kind = form?.get("kind");
    if (!(file instanceof File)) return fail("Fayl yuboring");
    if (kind !== "logo" && kind !== "reference") return fail("kind: logo yoki reference");
    if (file.size > MAX_UPLOAD) return fail("Rasm 5 MB dan katta", 413);
    const item = await saveAsset({ projectId: id, kind, input: Buffer.from(await file.arrayBuffer()), by: user.id, pending: form?.get("pending") === "1" });
    return ok({ item }, 201);
  });
}
