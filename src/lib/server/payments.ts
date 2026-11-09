import "server-only";
import { createHash } from "crypto";
import { safeEqual } from "./safeEqual";

/** Click payment page link (https://docs.click.uz) */
export function clickLink(p: {
  serviceId: string;
  merchantId: string;
  amount: number; // so'm
  orderId: string;
  returnUrl?: string;
}) {
  const q = new URLSearchParams({
    service_id: p.serviceId,
    merchant_id: p.merchantId,
    amount: p.amount.toFixed(2),
    transaction_param: p.orderId,
  });
  if (p.returnUrl) q.set("return_url", p.returnUrl);
  return `https://my.click.uz/services/pay?${q.toString()}`;
}

/** Payme checkout link (GET method): base64("m=...;ac.order_id=...;a=<tiyin>;c=<return>") */
export function paymeLink(p: { merchantId: string; amount: number; orderId: string; returnUrl?: string }) {
  const parts = [`m=${p.merchantId}`, `ac.order_id=${p.orderId}`, `a=${Math.round(p.amount * 100)}`];
  if (p.returnUrl) parts.push(`c=${p.returnUrl}`);
  return `https://checkout.paycom.uz/${Buffer.from(parts.join(";")).toString("base64")}`;
}

/** Click SHOP-API sign check for prepare (action=0) and complete (action=1). */
export function clickSignValid(
  f: Record<string, string>,
  secretKey: string,
): boolean {
  const base =
    f.click_trans_id +
    f.service_id +
    secretKey +
    f.merchant_trans_id +
    (f.action === "1" ? f.merchant_prepare_id || "" : "") +
    f.amount +
    f.action +
    f.sign_time;
  return safeEqual(createHash("md5").update(base).digest("hex"), f.sign_string);
}
