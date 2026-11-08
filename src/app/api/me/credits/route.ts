import { requireUser } from "@/lib/server/access";
import { creditHistory, getCredits } from "@/lib/server/credits";
import { handle, ok } from "@/lib/server/http";

/** The signed-in person's balance (credits) and recent history. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    if (user.isAdmin) return ok({ unmetered: true, credits: null, history: [] });
    return ok({ unmetered: false, credits: await getCredits(user.id), history: await creditHistory(user.id) });
  });
}
