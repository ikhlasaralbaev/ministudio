import { cookies } from "next/headers";
import { requireUser } from "@/lib/server/access";
import { handle, ok } from "@/lib/server/http";
import { REF_COOKIE, claimReferral, validRefCode } from "@/lib/server/referral";

/** Settles the referral cookie of a freshly signed-in account (the cookie is dropped either way: it is single-use). */
export async function POST() {
  return handle(async () => {
    const user = await requireUser();
    const jar = await cookies();
    const code = jar.get(REF_COOKIE)?.value;
    if (!code) return ok({ claimed: false });
    jar.delete(REF_COOKIE);
    if (!validRefCode(code)) return ok({ claimed: false });
    const r = await claimReferral(user.id, code);
    return ok({ claimed: r.ok });
  });
}
