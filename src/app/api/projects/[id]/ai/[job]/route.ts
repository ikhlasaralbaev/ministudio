import { ObjectId } from "mongodb";
import { requireProject } from "@/lib/server/access";
import { db } from "@/lib/server/db";
import { fail, handle, ok } from "@/lib/server/http";

// A running job that has not finished after this long was lost (e.g. the server restarted mid-call).
const LOST_AFTER_MS = 6 * 60 * 1000;

export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]/ai/[job]">) {
  return handle(async () => {
    const { id, job } = await ctx.params;
    const { user } = await requireProject(id, "update");
    if (!ObjectId.isValid(job)) return fail("Vazifa topilmadi", 404);
    const row = await (await db()).collection("ai_jobs").findOne({ _id: new ObjectId(job), projectId: id, userId: user.id });
    if (!row) return fail("Vazifa topilmadi", 404);
    // the page says whether it is open (and will announce the result itself); Telegram skips the notice then
    if (row.status === "running") {
      const w = Math.min(2, Math.max(0, Number(new URL(req.url).searchParams.get("w")) || 0));
      await (await db()).collection("ai_jobs").updateOne({ _id: row._id }, { $set: { seen: { at: new Date(), w } } }).catch(() => {});
    }
    if (row.status === "running" && Date.now() - new Date(row.createdAt).getTime() > LOST_AFTER_MS) {
      return ok({ status: "error", error: "AI so'rovi yo'qoldi (server qayta ishga tushgan bo'lishi mumkin). Qayta urinib ko'ring." });
    }
    return ok({ status: row.status, result: row.result, error: row.error });
  });
}
