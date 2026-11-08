import { requireAdmin } from "@/lib/server/access";
import { managerConfig, setupManager } from "@/lib/server/manager";
import { publicUrl } from "@/lib/server/projects";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: is the manager bot configured. POST: set its webhook and check Bot Management Mode. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const m = managerConfig();
    return ok({ configured: !!m, username: m?.username ?? null });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    try {
      return ok(await setupManager(publicUrl(req)));
    } catch (e) {
      return fail((e as Error).message, 400);
    }
  });
}
