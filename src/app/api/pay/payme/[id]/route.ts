import { db } from "@/lib/server/db";
import { envOf, getProject } from "@/lib/server/projects";
import { notifyPaid } from "@/lib/server/paid";

// Payme Merchant API (JSON-RPC). Endpoint for the Payme cabinet: https://<domain>/api/pay/payme/<projectId>
// Auth: Basic base64("Paycom:" + PAYME_KEY)
const TIMEOUT = 12 * 60 * 60 * 1000;

export async function POST(req: Request, ctx: RouteContext<"/api/pay/payme/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const rpcId = body.id ?? null;
  const ok = (result: unknown) => Response.json({ jsonrpc: "2.0", id: rpcId, result });
  const err = (code: number, message: string, data?: string) =>
    Response.json({ jsonrpc: "2.0", id: rpcId, error: { code, message: { uz: message, ru: message, en: message }, data } });

  const p = await getProject(id);
  if (!p) return err(-32504, "Unauthorized");
  const env = envOf(p);
  const auth = req.headers.get("authorization") || "";
  const expected = "Basic " + Buffer.from("Paycom:" + (env.PAYME_KEY || "")).toString("base64");
  if (!env.PAYME_KEY || auth !== expected) return err(-32504, "Unauthorized");

  const payments = (await db()).collection("payments");
  const params = body.params || {};
  const orderId = String(params.account?.order_id ?? "");
  const now = Date.now();

  const findOrder = () => payments.findOne({ projectId: id, orderId, provider: "payme" });
  const byTx = (txId: string) => payments.findOne({ projectId: id, paymeTxId: txId });

  switch (body.method) {
    case "CheckPerformTransaction": {
      const pay = await findOrder();
      if (!pay) return err(-31050, "Buyurtma topilmadi", "order_id");
      if (Math.round(pay.amount * 100) !== Number(params.amount)) return err(-31001, "Noto'g'ri summa");
      if (pay.status !== "pending") return err(-31050, "Buyurtma to'lab bo'lingan", "order_id");
      return ok({ allow: true });
    }
    case "CreateTransaction": {
      const existing = await byTx(params.id);
      if (existing) {
        if (existing.paymeState !== 1) return err(-31008, "Amalni bajarib bo'lmaydi");
        return ok({ create_time: existing.paymeCreateTime, transaction: String(existing._id), state: 1 });
      }
      const pay = await findOrder();
      if (!pay) return err(-31050, "Buyurtma topilmadi", "order_id");
      if (Math.round(pay.amount * 100) !== Number(params.amount)) return err(-31001, "Noto'g'ri summa");
      if (pay.paymeTxId && pay.paymeState === 1) return err(-31050, "Buyurtma band", "order_id");
      if (pay.status !== "pending") return err(-31050, "Buyurtma to'lab bo'lingan", "order_id");
      // Atomic claim: only one concurrent CreateTransaction can take a pending, unclaimed order.
      const claimed = await payments.updateOne(
        { _id: pay._id, status: "pending", $or: [{ paymeTxId: { $exists: false } }, { paymeState: { $ne: 1 } }] },
        { $set: { paymeTxId: params.id, paymeState: 1, paymeCreateTime: now, paymeTime: params.time } },
      );
      if (!claimed.matchedCount) return err(-31050, "Buyurtma band", "order_id");
      return ok({ create_time: now, transaction: String(pay._id), state: 1 });
    }
    case "PerformTransaction": {
      const tx = await byTx(params.id);
      if (!tx) return err(-31003, "Tranzaksiya topilmadi");
      if (tx.paymeState === 2) return ok({ transaction: String(tx._id), perform_time: tx.paymePerformTime, state: 2 });
      if (tx.paymeState !== 1) return err(-31008, "Amalni bajarib bo'lmaydi");
      if (now - tx.paymeCreateTime > TIMEOUT) {
        await payments.updateOne({ _id: tx._id }, { $set: { paymeState: -1, paymeReason: 4, paymeCancelTime: now, status: "cancelled" } });
        return err(-31008, "Tranzaksiya muddati o'tgan");
      }
      // Atomic: only the call that flips state 1 -> 2 notifies the owner.
      const done = await payments.updateOne(
        { _id: tx._id, paymeState: 1 },
        { $set: { paymeState: 2, paymePerformTime: now, status: "paid", paidAt: new Date() } },
      );
      if (!done.matchedCount) {
        const again = await byTx(params.id);
        if (again?.paymeState === 2) return ok({ transaction: String(again._id), perform_time: again.paymePerformTime, state: 2 });
        return err(-31008, "Amalni bajarib bo'lmaydi");
      }
      await notifyPaid(env, { orderId: tx.orderId, amount: tx.amount, provider: "Payme", description: tx.description });
      return ok({ transaction: String(tx._id), perform_time: now, state: 2 });
    }
    case "CancelTransaction": {
      const tx = await byTx(params.id);
      if (!tx) return err(-31003, "Tranzaksiya topilmadi");
      if (tx.paymeState === 1 || tx.paymeState === 2) {
        const state = tx.paymeState === 1 ? -1 : -2;
        const c = await payments.updateOne(
          { _id: tx._id, paymeState: tx.paymeState },
          { $set: { paymeState: state, paymeReason: params.reason, paymeCancelTime: now, status: "cancelled" } },
        );
        if (!c.matchedCount) return err(-31008, "Amalni bajarib bo'lmaydi");
        return ok({ transaction: String(tx._id), cancel_time: now, state });
      }
      return ok({ transaction: String(tx._id), cancel_time: tx.paymeCancelTime, state: tx.paymeState });
    }
    case "CheckTransaction": {
      const tx = await byTx(params.id);
      if (!tx) return err(-31003, "Tranzaksiya topilmadi");
      return ok({
        create_time: tx.paymeCreateTime,
        perform_time: tx.paymePerformTime || 0,
        cancel_time: tx.paymeCancelTime || 0,
        transaction: String(tx._id),
        state: tx.paymeState,
        reason: tx.paymeReason ?? null,
      });
    }
    case "GetStatement": {
      const list = await payments
        .find({ projectId: id, provider: "payme", paymeCreateTime: { $gte: params.from, $lte: params.to } })
        .toArray();
      return ok({
        transactions: list.map((t) => ({
          id: t.paymeTxId,
          time: t.paymeTime,
          amount: Math.round(t.amount * 100),
          account: { order_id: t.orderId },
          create_time: t.paymeCreateTime,
          perform_time: t.paymePerformTime || 0,
          cancel_time: t.paymeCancelTime || 0,
          transaction: String(t._id),
          state: t.paymeState,
          reason: t.paymeReason ?? null,
        })),
      });
    }
  }
  return err(-32601, "Method not found");
}
