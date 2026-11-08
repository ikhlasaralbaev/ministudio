import { requireUser } from "@/lib/server/access";
import { createProject, projects } from "@/lib/server/projects";
import { AppDocSchema } from "@/lib/types";
import { fail, handle, ok } from "@/lib/server/http";
import { ObjectId } from "mongodb";

const MAX_BYTES = 2_000_000;

/** Body: the text of an exported .ministudio.json file. The document is validated like any AI-made one. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return fail("Fayl juda katta (2 MB gacha)", 413);
    let data: { format?: string; name?: unknown; doc?: unknown };
    try {
      data = JSON.parse(raw);
    } catch {
      return fail("Bu JSON fayl emas");
    }
    if (data?.format !== "ministudio.app") return fail("Bu MiniStudio'dan eksport qilingan fayl emas");
    const parsed = AppDocSchema.safeParse(data.doc);
    if (!parsed.success) return fail(`Ilova hujjati noto'g'ri: ${parsed.error.issues[0]?.path.join(".")} (${parsed.error.issues[0]?.message})`);
    const name = typeof data.name === "string" && data.name.trim() ? data.name : parsed.data.name || "Import";
    const id = await createProject(user.id, name);
    await (await projects()).updateOne({ _id: new ObjectId(id) }, { $set: { doc: parsed.data, updatedAt: new Date() } });
    return ok({ _id: id }, 201);
  });
}
