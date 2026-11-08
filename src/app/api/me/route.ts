import { requireUser } from "@/lib/server/access";
import { getCredits } from "@/lib/server/credits";
import { handle, ok } from "@/lib/server/http";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    // platform admins are not metered: no balance to show
    return ok({ ...user, credits: user.isAdmin ? null : await getCredits(user.id) });
  });
}
