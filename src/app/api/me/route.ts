import { requireUser } from "@/lib/server/access";
import { handle, ok } from "@/lib/server/http";

export async function GET() {
  return handle(async () => ok(await requireUser()));
}
