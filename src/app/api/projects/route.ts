import { customAlphabet } from "nanoid";
import { projects, toDTO } from "@/lib/server/projects";
import { requireUser } from "@/lib/server/access";
import { effectivePermissions } from "@/lib/permissions";
import { fail, handle, ok } from "@/lib/server/http";

const slugId = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

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

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { name } = await req.json().catch(() => ({}));
    if (!name || typeof name !== "string") return fail("Loyiha nomini kiriting");
    const now = new Date();
    const row = {
      name: name.slice(0, 80),
      slug: slugId(),
      doc: null,
      publishedVersion: 0,
      ownerId: user.id,
      members: [],
      createdAt: now,
      updatedAt: now,
    };
    const r = await (await projects()).insertOne(row);
    return ok({ _id: r.insertedId.toHexString() }, 201);
  });
}
