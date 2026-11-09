import { requireUser } from "@/lib/server/access";
import { handle, ok } from "@/lib/server/http";
import { REFERRAL_CREDITS, referralStats } from "@/lib/server/referral";

/** The person's referral code, how many friends joined through it and what that earned. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({ ...(await referralStats(user.id)), reward: REFERRAL_CREDITS() });
  });
}
