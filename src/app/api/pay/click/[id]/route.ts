import { db } from "@/lib/server/db";
import { envOf, getProject } from "@/lib/server/projects";
import { clickSignValid } from "@/lib/server/payments";
import { notifyPaid } from "@/lib/server/paid";

// Click SHOP-API: Prepare (action=0) and Complete (action=1) both point here:
//   https://<domain>/api/pay/click/<projectId>
export async function POST(req: Request, ctx: RouteContext<"/api/pay/click/[id]">) {
  const { id } = await ctx.params;
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  const reply = (error: number, error_note: string, extra: Record<string, unknown> = {}) =>
    Response.json({
      click_trans_id: form.click_trans_id,
      merchant_trans_id: form.merchant_trans_id,
      error,
      error_note,
      ...extra,
    });

  const p = await getProject(id);
  if (!p) return reply(-5, "Project not found");
  const env = envOf(p);
  if (!env.CLICK_SECRET_KEY || !clickSignValid(form, env.CLICK_SECRET_KEY)) return reply(-1, "SIGN CHECK FAILED");

  const payments = (await db()).collection("payments");
  const pay = await payments.findOne({ projectId: id, orderId: form.merchant_trans_id, provider: "click" });
  if (!pay) return reply(-5, "Order not found");
  if (Math.abs(Number(form.amount) - pay.amount) > 0.01) return reply(-2, "Incorrect amount");
  if (pay.status === "paid") return reply(-4, "Already paid");
  if (pay.status === "cancelled") return reply(-9, "Transaction cancelled");

  if (form.action === "0") {
    // Prepare is only valid for a fresh order; a repeated prepare with the same click_trans_id is idempotent.
    const r = await payments.updateOne(
      { _id: pay._id, $or: [{ status: "pending" }, { status: "preparing", clickTransId: form.click_trans_id }] },
      { $set: { status: "preparing", clickTransId: form.click_trans_id } },
    );
    if (!r.matchedCount) return reply(-4, "Already in progress");
    return reply(0, "Success", { merchant_prepare_id: pay.orderId });
  }
  if (form.action === "1") {
    // Complete requires a prior prepare by the same Click transaction.
    if (pay.status !== "preparing" || pay.clickTransId !== form.click_trans_id) return reply(-6, "Transaction does not exist");
    if (form.merchant_prepare_id !== pay.orderId) return reply(-6, "Transaction does not exist");
    if (Number(form.error) < 0) {
      await payments.updateOne({ _id: pay._id, status: "preparing" }, { $set: { status: "cancelled" } });
      return reply(-9, "Transaction cancelled");
    }
    // Atomic: only the request that flips preparing -> paid notifies the owner.
    const r = await payments.updateOne({ _id: pay._id, status: "preparing" }, { $set: { status: "paid", paidAt: new Date() } });
    if (!r.matchedCount) return reply(-4, "Already paid");
    await notifyPaid(env, { orderId: pay.orderId, amount: pay.amount, provider: "Click", description: pay.description });
    return reply(0, "Success", { merchant_confirm_id: pay.orderId });
  }
  return reply(-3, "Action not found");
}
