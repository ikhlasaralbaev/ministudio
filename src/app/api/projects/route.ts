import { createProject, projects, toDTO } from "@/lib/server/projects";
import { nameFromIdea } from "@/lib/idea";
import { buildTemplate, isTemplateId } from "@/lib/gallery";
import { getLocale } from "@/i18n/server";
import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/server/access";
import { effectivePermissions } from "@/lib/permissions";
import { fail, handle, ok } from "@/lib/server/http";

/** Projects the user owns or is a member of (admins see everything in /admin, not here). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const list = await (await projects())
      .find(
        { $or: [{ ownerId: user.id }, { "members.userId": user.id }] },
        { projection: { history: 0, publishedDoc: 0, envEnc: 0 } },
      )
      .sort({ updatedAt: -1 })
      .toArray();
    return ok(
      list.flatMap((p) => {
        const perms = effectivePermissions(p, user, user.isAdmin);
        return perms ? [{ ...toDTO(p, perms), doc: null, screens: p.doc?.screens.length || 0, theme: p.doc?.theme }] : [];
      }),
    );
  });
}

/** Body: { idea } (preferred: the name comes from it and Studio starts generating) or { name } (an empty project). */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (body.template !== undefined) {
      // a ready-made starting point: no AI request, so it costs nothing
      if (!isTemplateId(body.template)) return fail("Noma'lum shablon");
      const doc = buildTemplate(body.template, await getLocale())!;
      const id = await createProject(user.id, doc.name);
      await (await projects()).updateOne({ _id: new ObjectId(id) }, { $set: { doc, updatedAt: new Date() } });
      return ok({ _id: id }, 201);
    }
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    if (idea) {
      const id = await createProject(user.id, nameFromIdea(idea), { autoName: true, pendingIdea: idea });
      return ok({ _id: id }, 201);
    }
    if (!body.name || typeof body.name !== "string") return fail("Nima yaratishni yozing");
    return ok({ _id: await createProject(user.id, body.name) }, 201);
  });
}
