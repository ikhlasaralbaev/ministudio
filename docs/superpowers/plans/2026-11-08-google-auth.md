# Google auth, jamoalar va platforma admini — amalga oshirish rejasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MiniStudio admin qismini `ADMIN_PASSWORD` o'rniga Google login, loyiha egaligi, ruxsatli a'zolar va platforma admini bilan himoyalash.

**Architecture:** Better Auth (Google, MongoDB adapter) sessiyani beradi. Ruxsat mantig'i sof funksiyalarda (`src/lib/permissions.ts`), har bir route handler esa uni `requireUser` / `requireProject` / `requireAdmin` (`src/lib/server/access.ts`) orqali majburiy chaqiradi. `proxy.ts` faqat tezkor cookie tekshiruvi.

**Tech Stack:** Next.js 16.4 (App Router, `src/proxy.ts`), React 19, MongoDB driver 7, better-auth 1.7.18, zod 4, vitest (yangi).

**Spec:** `docs/superpowers/specs/2026-11-08-google-auth-design.md` — har bir vazifa uni o'qigan holda bajariladi.

**Repo holati:** loyiha git repozitoriy emas. Har vazifa oxiridagi "Checkpoint" commit o'rnida: `npm test && npx tsc --noEmit && npx eslint src` toza o'tishi kerak. (Agar foydalanuvchi `git init` qilsa, checkpoint'larda commit qilinadi.)

## Global Constraints

- Paket: `better-auth@1.7.18` (aniq versiya). Auth.js ishlatilmaydi. Better Auth `admin` plugini ishlatilmaydi.
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `SUPER_ADMIN_EMAILS` (vergul bilan); base URL = `PUBLIC_URL`. `ADMIN_PASSWORD` butunlay olib tashlanadi.
- Google callback: `<PUBLIC_URL>/api/auth/callback/google`.
- Ochiq yo'llar o'zgarmaydi: `/app/*`, `/api/rt/*`, `/api/bot/*`, `/api/pay/*`; qo'shiladi: `/login`, `/api/auth/*`.
- A'zo bo'lmagan foydalanuvchiga loyiha: **404 "Topilmadi"**. A'zo, lekin ruxsati yetmasa: **403**.
- Email solishtirish hamma joyda `normalizeEmail` orqali (trim + lowercase).
- Bitta loyihada a'zolar ≤ **50**.
- Secretlar hech kimga (adminga ham) to'liq qaytarilmaydi; `ownerLink` faqat `update` bilan.
- Better Auth sessiya **cookie cache yoqilmaydi** (bloklash darhol ta'sir qilishi uchun).
- UI matnlari o'zbekcha (lotin).

## Review Focus

1. Taklif emaili katta harf/bo'sh joy bilan kiritilgan (`" Ali@Gmail.com"`), Google esa `ali@gmail.com` qaytaradi → taklif baribir bog'lanishi kerak. (Task 1, Task 4 testlari)
2. `read` a'zo UI'ni chetlab, yozish API'larini to'g'ridan-to'g'ri chaqiradi (PATCH doc, PUT env, publish, ai, members, DELETE) → 403. (Task 3 guard testi + qo'lda matritsa)
3. `manageMembers` huquqli a'zo egani, `update`li yoki `deleteProject`li a'zoni o'zgartirishga/o'chirishga, yoki o'zida yo'q huquqni berishga urinadi → rad. (Task 1 testlari)
4. Bloklangan foydalanuvchi ochiq turgan sessiya cookie'si bilan so'rov yuboradi → darhol 401/403, sessiyalari o'chirilgan. (Task 7 qo'lda tekshiruv; Task 2 `requireUser` testi)
5. To'xtatilgan loyihaning boshlangan Click/Payme to'lovi callback'i keladi → to'lov baribir yakunlanadi; mini app esa "to'xtatilgan" ko'rsatadi. (Task 5 qo'lda tekshiruv)

---

### Task 1: Test muhiti va sof ruxsat mantig'i

**Files:**
- Create: `vitest.config.ts`, `test/stubs/server-only.ts`, `src/lib/permissions.ts`, `test/permissions.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces (`src/lib/permissions.ts`, `server-only` IMPORT QILMAYDI — client UI ham ishlatadi):
  ```ts
  export type Access = "read" | "update";
  export type Need = "read" | "update" | "manageMembers" | "deleteProject";
  export interface Member { userId: string | null; email: string; access: Access; manageMembers: boolean; deleteProject: boolean; addedBy: string; addedAt: Date | string }
  export interface Grant { access: Access; manageMembers: boolean; deleteProject: boolean }
  export interface Perms { read: boolean; update: boolean; manageMembers: boolean; deleteProject: boolean; isOwner: boolean; isAdmin: boolean; viaAdmin: boolean }
  export const MAX_MEMBERS = 50;
  export function normalizeEmail(s: string): string;
  export function effectivePermissions(p: { ownerId?: string | null; members?: Member[] }, user: { id: string }, isAdmin: boolean): Perms | null;
  export function has(perms: Perms, need: Need): boolean;
  export function checkMemberChange(actor: Perms, actorUserId: string, target: Member | null, next: Grant | null): string | null; // null = ruxsat, aks holda o'zbekcha xato matni
  ```
  `viaAdmin` = admin, lekin ega ham, a'zo ham emas. Egasiz loyiha (`ownerId` yo'q) → faqat admin uchun Perms, boshqalarga `null`. A'zo faqat `userId` bo'yicha mos keladi (email bo'yicha emas).

- [ ] **Step 1: vitest o'rnatish va sozlash.** `npm i -D vitest`; `vitest.config.ts` da `resolve.alias`: `@` → `src`, `server-only` → `test/stubs/server-only.ts` (bo'sh modul); `test.include: ["test/**/*.test.ts"]`.
- [ ] **Step 2: Muvaffaqiyatsiz testlarni yozish** — `test/permissions.test.ts`:
  ```ts
  const owner = { id: "u1" }, stranger = { id: "u9" };
  const m = (o: Partial<Member>): Member => ({ userId: "u2", email: "a@x.uz", access: "read", manageMembers: false, deleteProject: false, addedBy: "u1", addedAt: new Date(), ...o });
  // normalizeEmail
  expect(normalizeEmail("  Ali@Gmail.COM ")).toBe("ali@gmail.com");
  // effectivePermissions
  expect(effectivePermissions({ ownerId: "u1", members: [] }, owner, false)).toMatchObject({ read: true, update: true, manageMembers: true, deleteProject: true, isOwner: true, viaAdmin: false });
  expect(effectivePermissions({ ownerId: "u1", members: [] }, stranger, false)).toBeNull();
  expect(effectivePermissions({ ownerId: "u1", members: [m({})] }, { id: "u2" }, false)).toMatchObject({ read: true, update: false, manageMembers: false, deleteProject: false, isOwner: false });
  expect(effectivePermissions({ ownerId: "u1", members: [m({ userId: null })] }, { id: "u2" }, false)).toBeNull(); // kutilayotgan taklif dostup bermaydi
  expect(effectivePermissions({ ownerId: null, members: [] }, stranger, false)).toBeNull();
  expect(effectivePermissions({ ownerId: null, members: [] }, stranger, true)).toMatchObject({ update: true, isAdmin: true, viaAdmin: true });
  expect(effectivePermissions({ ownerId: "u9", members: [] }, stranger, true)).toMatchObject({ isOwner: true, viaAdmin: false });
  // checkMemberChange
  const P = (o: Partial<Perms>): Perms => ({ read: true, update: false, manageMembers: false, deleteProject: false, isOwner: false, isAdmin: false, viaAdmin: false, ...o });
  const g = (o: Partial<Grant>): Grant => ({ access: "read", manageMembers: false, deleteProject: false, ...o });
  expect(checkMemberChange(P({ isOwner: true, update: true, manageMembers: true, deleteProject: true }), "u1", null, g({ access: "update", deleteProject: true }))).toBeNull();
  expect(checkMemberChange(P({}), "u2", null, g({}))).not.toBeNull();                                     // manageMembers yo'q
  expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ access: "update" }))).not.toBeNull(); // read update bera olmaydi
  expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ deleteProject: true }))).not.toBeNull();
  expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ manageMembers: true }))).toBeNull();
  expect(checkMemberChange(P({ manageMembers: true }), "u2", m({ userId: "u3", access: "update" }), null)).not.toBeNull(); // kuchliroqni o'chira olmaydi
  expect(checkMemberChange(P({ manageMembers: true, update: true }), "u2", m({ userId: "u3", deleteProject: true }), g({}))).not.toBeNull();
  expect(checkMemberChange(P({}), "u2", m({ userId: "u2" }), null)).toBeNull();                           // o'zini chiqarish — har kim
  expect(checkMemberChange(P({ manageMembers: true }), "u2", m({ userId: "u2", manageMembers: true }), g({ access: "update" }))).not.toBeNull(); // o'zini oshira olmaydi
  expect(checkMemberChange(P({ isAdmin: true, viaAdmin: true, update: true, manageMembers: true, deleteProject: true }), "u9", m({ access: "update", deleteProject: true }), null)).toBeNull();
  ```
- [ ] **Step 3:** `npm test` → FAIL (modul yo'q).
- [ ] **Step 4: `src/lib/permissions.ts` ni yozish.** `checkMemberChange` qoidalari tartibi: (1) `actor.isOwner || actor.isAdmin` → null; (2) `next === null && target?.userId === actorUserId` → null; (3) `!actor.manageMembers` → xato; (4) `target` bo'lsa: `target.access === "update" && !actor.update` yoki `target.deleteProject && !actor.deleteProject` → xato; (5) `next` bo'lsa: `next.access === "update" && !actor.update`, `next.deleteProject && !actor.deleteProject` → xato. Egani o'zgartirish bu funksiyaga yetib kelmaydi (ega `members` da yo'q).
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Checkpoint.**

---

### Task 2: Google login (Better Auth), login sahifasi, proxy

**Files:**
- Modify: `src/lib/server/db.ts`, `src/proxy.ts`, `src/components/ui.tsx`, `src/app/page.tsx` (sarlavhaga `UserMenu`), `.env.example`, `README.md`, `package.json`
- Create: `src/lib/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts`, `src/lib/server/access.ts`, `src/app/api/me/route.ts`, `src/app/login/page.tsx`, `test/access.test.ts`

**Interfaces:**
- Consumes: `HttpError` (`src/lib/server/http.ts`), `normalizeEmail`.
- Produces:
  - `db.ts`: `export function rawDb(): Db` — sinxron, ulanishni kutmaydi (driver o'zi ulanadi); mavjud `db(): Promise<Db>` saqlanadi va bir xil `MongoClient` ishlatadi.
  - `auth.ts`: `export const auth` (betterAuth instance). Model nomlari Better Auth default'i: `user`, `session`, `account`, `verification`.
  - `access.ts` (`server-only`):
    ```ts
    export interface SessionUser { id: string; email: string; name: string; image?: string | null; isAdmin: boolean }
    export function isPlatformAdmin(email: string): boolean;          // SUPER_ADMIN_EMAILS, normalizeEmail bilan
    export async function requireUser(): Promise<SessionUser>;        // yo'q → HttpError 401 "Kirish talab qilinadi"; banned → 403 "Akkaunt bloklangan"
    export async function requireAdmin(): Promise<SessionUser>;       // admin emas → HttpError 404 "Topilmadi"
    ```
  - `GET /api/me` → `SessionUser`.
  - `auth-client.ts`: `export const authClient = createAuthClient()` (`better-auth/react`).
  - `ui.tsx`: `export function UserMenu()` — `/api/me` dan oladi; avatar/email, "Chiqish" (`authClient.signOut` → `/login`), admin uchun `/admin` havolasi.

- [ ] **Step 1: Muvaffaqiyatsiz test** — `test/access.test.ts`: `process.env.SUPER_ADMIN_EMAILS = " Boss@x.uz, two@x.uz ,"` bilan `isPlatformAdmin("boss@X.uz")` → true, `isPlatformAdmin("two@x.uz")` → true, `isPlatformAdmin("")` → false, `isPlatformAdmin("other@x.uz")` → false. (`auth.ts` ni `vi.mock("@/lib/server/auth", () => ({ auth: {} }))` bilan almashtiring.)
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: `npm i better-auth@1.7.18`; `db.ts` da `rawDb()`.**
- [ ] **Step 4: `auth.ts`.** `betterAuth({ database: mongodbAdapter(rawDb()), baseURL: process.env.PUBLIC_URL, secret: process.env.BETTER_AUTH_SECRET, socialProviders: { google: { clientId, clientSecret, prompt: "select_account" } }, user: { additionalFields: { banned: { type: "boolean", defaultValue: false, input: false } } }, databaseHooks: {...}, plugins: [nextCookies()] })`. Importlar: `mongodbAdapter` — `better-auth/adapters/mongodb`, `nextCookies`/`toNextJsHandler` — `better-auth/next-js`. Hook'lar:
  - `user.create.before`: `emailVerified` false bo'lsa `return false`.
  - `session.create.before`: foydalanuvchi `banned` bo'lsa `return false`.
  - `session.create.after`: `linkInvites(userId, email)` (Task 4 da yoziladi; hozircha `projects.ts` da bo'sh `export async function linkInvites(userId: string, email: string): Promise<void>` qoldiring).
  Mongo adapteriga `client` berilmaydi (lokal standalone Mongo'da tranzaksiya yo'q).
- [ ] **Step 5: `api/auth/[...all]/route.ts`:** `export const { GET, POST } = toNextJsHandler(auth)`.
- [ ] **Step 6: `access.ts` va `/api/me`.** Sessiya: `auth.api.getSession({ headers: await headers() })`. `banned` har so'rovda sessiyadagi user'dan tekshiriladi.
- [ ] **Step 7: `proxy.ts` ni almashtirish.** Basic auth va `safeEqual`/`passwordFrom` o'chiriladi. Ochiq: mavjud `PUBLIC` + `/^\/login/`, `/^\/api\/auth\//`. `getSessionCookie(req)` (`better-auth/cookies`) yo'q bo'lsa: `/api/*` → `401 {"error":"Kirish talab qilinadi"}`, sahifalar → `/login?next=<pathname>` ga redirect.
- [ ] **Step 8: `/login` sahifasi** (client): logo, "Promptdan Telegram Mini App'gacha", "Google bilan kirish" tugmasi → `authClient.signIn.social({ provider: "google", callbackURL: next || "/", errorCallbackURL: "/login?error=1" })`. `?error` bo'lsa: "Kirish rad etildi. Akkauntingiz bloklangan bo'lishi mumkin."
- [ ] **Step 9: `UserMenu`** ni dashboard sarlavhasi va `ProjectNav` ning o'ng tomoniga qo'shish.
- [ ] **Step 10: `.env.example` va README.** `ADMIN_PASSWORD` ni o'chirish; Global Constraints'dagi env'lar va Google Cloud Console qadamlari (OAuth client, authorized redirect URI).
- [ ] **Step 11:** `npm test` → PASS; `npx tsc --noEmit`, `npx eslint src` toza.
- [ ] **Step 12: Qo'lda tekshirish** (MongoDB va Google OAuth kalitlari kerak): `npm run dev` → `/` → `/login` ga yo'naltiriladi; Google bilan kirish → `/`; `curl -i localhost:3000/api/projects` (cookie'siz) → 401; "Chiqish" → `/login`.
- [ ] **Checkpoint.**

---

### Task 3: Loyiha egaligi va har bir marshrutni himoyalash

**Files:**
- Create: `src/lib/server/audit.ts`, `test/route-guards.test.ts`
- Modify: `src/lib/server/access.ts`, `src/lib/server/projects.ts`, `src/lib/server/db.ts` (indekslar), `src/lib/types.ts` (`ProjectDTO`), `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts`, `.../records/route.ts`, `.../env/route.ts`, `.../publish/route.ts`, `.../ai/route.ts`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `effectivePermissions`, `has`, `Perms`, `Member` (Task 1); `requireUser`, `SessionUser` (Task 2).
- Produces:
  - `ProjectRow` ga: `ownerId?: string | null; members?: Member[]; suspended?: { at: Date; by: string; reason?: string } | null`.
  - `ProjectDTO` ga: `ownerId: string | null; permissions: Perms; suspended: boolean`.
  - `toDTO(p, perms: Perms): ProjectDTO`.
  - `access.ts`: `export async function requireProject(id: string, need: Need): Promise<{ project: WithId<ProjectRow>; user: SessionUser; perms: Perms }>` — `null` perms → HttpError 404 "Topilmadi"; `!has(perms, need)` → HttpError 403 "Ruxsat yo'q"; `perms.viaAdmin` bo'lsa `auditAdminView`.
  - `audit.ts`:
    ```ts
    export interface AuditEntry { actorId: string; actorEmail: string; asAdmin: boolean; action: string; projectId?: string; targetUserId?: string; targetEmail?: string; details?: Record<string, unknown> }
    export async function audit(e: AuditEntry): Promise<void>;            // `audit` kolleksiyasiga `at: new Date()` bilan
    export async function auditAdminView(user: SessionUser, projectId: string): Promise<void>; // bir jarayonda (user, project) juftiga soatiga 1 marta
    ```
    `action` qiymatlari (shu nomlar bilan): `project.view`, `project.update`, `project.delete`, `project.publish`, `env.update`, `member.add`, `member.update`, `member.remove`, `user.ban`, `user.unban`, `project.suspend`, `project.unsuspend`, `project.assignOwner`, `ai.generate`, `ai.edit`.
    Qoidasi: a'zolik, o'chirish, publish, env, ban, suspend, assignOwner — har doim yoziladi; `project.update` va `ai.*` faqat `perms.viaAdmin` bo'lganda.
- Indekslar (`db()` ichida): `projects: {ownerId:1}`, `{"members.userId":1}`, `{"members.email":1}`; `audit: {at:-1}`, `{projectId:1, at:-1}`.

- [ ] **Step 1: Muvaffaqiyatsiz guard testi** — `test/route-guards.test.ts`: `src/app/api/projects/**/route.ts` va `src/app/api/admin/**/route.ts` dagi har bir fayl matnida `requireProject(` yoki `requireUser(` yoki `requireAdmin(` bo'lishi; har bir eksport qilingan HTTP metod (`export async function (GET|POST|PATCH|PUT|DELETE)`) soni guard chaqiruvlari sonidan oshmasligi. Hozircha admin papkasi yo'q — glob bo'sh bo'lsa ham test o'tadi.
- [ ] **Step 2:** `npm test` → FAIL (project route'larida guard yo'q).
- [ ] **Step 3: `audit.ts`, `requireProject`, `toDTO`, indekslar.**
- [ ] **Step 4: Marshrutlarni spec 6.4 jadvali bo'yicha himoyalash:**
  - `GET /api/projects`: `requireUser`; filtr `{ $or: [{ ownerId: user.id }, { "members.userId": user.id }] }`; har qatorga `permissions`.
  - `POST /api/projects`: `requireUser`; `ownerId: user.id, members: []`.
  - `GET [id]` read; `PATCH [id]` update (`perms.viaAdmin` bo'lsa audit `project.update`); `DELETE [id]` deleteProject (audit `project.delete`; kaskad Task 5 da).
  - `records GET` read; `env GET` read — `ownerLink` faqat `perms.update` bo'lsa, aks holda `null`; `env PUT` update — audit `env.update` `details: { keys: <o'zgargan kalit nomlari> }`.
  - `publish POST` update — `project.suspended && !perms.isAdmin` → 403 "Loyiha administrator tomonidan to'xtatilgan"; audit `project.publish` `{ version }`.
  - `ai POST` update.
  - Har bir `getProject(id)` chaqiruvi `requireProject` bilan almashtiriladi.
- [ ] **Step 5: Dashboard (`/`)**: ikki guruh — "Mening loyihalarim" (`permissions.isOwner`) va "Men a'zo bo'lgan loyihalar" (rol belgisi: "Ko'rish" / "Tahrirlash"). O'chirish tugmasi faqat `permissions.deleteProject` bo'lsa.
- [ ] **Step 6:** `npm test` → PASS; tsc, eslint toza.
- [ ] **Step 7: Qo'lda matritsa** (ikki Google akkaunt, ikki brauzer profili; A loyiha yaratadi): B `/api/projects` ro'yxatida A loyihasini ko'rmaydi; B `GET/PATCH/DELETE /api/projects/<A id>`, `/env`, `/records`, `/publish`, `/ai` → hammasi 404. Egasiz (eski) loyiha oddiy foydalanuvchi ro'yxatida yo'q, `SUPER_ADMIN_EMAILS` dagi akkauntga `GET` ochiladi.
- [ ] **Checkpoint.**

---

### Task 4: A'zolar API va sozlamalar UI

**Files:**
- Create: `src/app/api/projects/[id]/members/route.ts`, `src/app/api/projects/[id]/members/[email]/route.ts`, `src/components/Members.tsx`, `test/members.test.ts`
- Modify: `src/lib/server/projects.ts` (`linkInvites`, a'zo yordamchilari), `src/app/projects/[id]/settings/page.tsx`

**Interfaces:**
- Consumes: `checkMemberChange`, `normalizeEmail`, `MAX_MEMBERS`, `Grant`, `Member` (Task 1); `requireProject`, `audit` (Task 3).
- Produces:
  - `projects.ts`:
    ```ts
    export function memberInput(body: unknown): { ok: true; email: string; grant: Grant } | { ok: false; error: string }; // zod; email normalize qilingan
    export async function linkInvites(userId: string, email: string): Promise<void>;
    ```
    `linkInvites`: `updateMany({ members: { $elemMatch: { email: normalizeEmail(email), userId: null } } }, { $set: { "members.$[m].userId": userId } }, { arrayFilters: [{ "m.email": normalizeEmail(email), "m.userId": null }] })`.
  - API (`[email]` = `encodeURIComponent(normalizeEmail(email))`):
    - `GET /members` (read) → `{ owner: { userId, email, name, image } | null, members: (Member & { name?: string; image?: string | null })[] }`.
    - `POST /members` (manageMembers) body `{ email, access, manageMembers, deleteProject }` → 201 `{ member }`. Xatolar (400): noto'g'ri email; ega emaili; takror; `members.length >= MAX_MEMBERS` → "A'zolar soni 50 tadan oshmaydi"; `checkMemberChange` xatosi → 403. Shu emailli foydalanuvchi `user` kolleksiyasida bo'lsa `userId` darhol yoziladi. Audit `member.add`.
    - `PATCH /members/[email]` body `{ access, manageMembers, deleteProject }` — `requireProject(id, "read")`, a'zo topilmasa 404 "A'zo topilmadi", so'ng `checkMemberChange(perms, user.id, target, grant)` (xato → 403) → audit `member.update` `{ from, to }`.
    - `DELETE /members/[email]` — `requireProject(id, "read")`, so'ng `checkMemberChange(perms, user.id, target, null)`; o'zini chiqarish shu yo'l bilan ishlaydi. Audit `member.remove`.
- [ ] **Step 1: Muvaffaqiyatsiz test** — `test/members.test.ts` (`memberInput` sof funksiyasi):
  - `memberInput({ email: " Ali@Gmail.com ", access: "update", manageMembers: true, deleteProject: false })` → `{ ok: true, email: "ali@gmail.com", grant: { access: "update", manageMembers: true, deleteProject: false } }`
  - `memberInput({ email: "not-an-email", access: "read" })` → `ok: false`
  - `memberInput({ email: "a@b.uz", access: "admin" })` → `ok: false`
  - `memberInput({ email: "a@b.uz", access: "read" })` → `grant.manageMembers === false && grant.deleteProject === false` (default).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: `memberInput`, `linkInvites`, ikki route fayl.**
- [ ] **Step 4:** `npm test` → PASS (route-guards testi ham yangi fayllarni qamraydi).
- [ ] **Step 5: `Members.tsx` va sozlamalar sahifasi.** Bo'lim "A'zolar": ega qatori; a'zolar ro'yxati (avatar/ism yoki email, "kirishini kutmoqda" belgisi `userId === null` bo'lsa, dostup tanlovi, ikki katakcha, o'chirish); qo'shish formasi (email, `Ko'rish`/`Tahrirlash`, "A'zolarni boshqarish", "Loyihani o'chirish"). Qo'shilgach: "Kirish havolasi: <origin>/login" + "Nusxalash". Ruxsat yo'q boshqaruvlar ko'rsatilmaydi (UI `checkMemberChange` ni ham chaqirib, imkonsiz variantlarni o'chiradi). "Loyihadan chiqish" tugmasi ega bo'lmagan a'zoga. `read` uchun env formasi `disabled`, "Saqlash" yashirin; `ownerLink` `null` bo'lsa blok ko'rsatilmaydi.
- [ ] **Step 6: Qo'lda:** A egasi B emailini (`" B@Gmail.com"` ko'rinishida) `read` qilib qo'shadi; B hali kirmagan → "kirishini kutmoqda"; B kiradi → loyiha B ning "Men a'zo bo'lgan" ro'yxatida; B ning studio'si faqat ko'rish (Task 5 dan keyin); B `PATCH /api/projects/<id>` → 403; B `POST /members` → 403; B "Loyihadan chiqish" → ro'yxatdan yo'qoladi.
- [ ] **Checkpoint.**

---

### Task 5: Faqat ko'rish studio, to'xtatilgan loyiha, o'chirish kaskadi

**Files:**
- Modify: `src/components/studio/Studio.tsx`, `src/components/studio/Inspector.tsx`, `src/components/studio/Layers.tsx`, `src/components/ui.tsx` (`ProjectNav` bannerlari), `src/lib/server/projects.ts`, `src/app/api/projects/[id]/route.ts` (DELETE), `src/app/page.tsx` (o'chirish tasdig'i), `src/app/api/rt/[slug]/route.ts`, `src/app/api/rt/[slug]/action/route.ts`, `src/app/api/bot/[id]/route.ts`

**Interfaces:**
- Consumes: `ProjectDTO.permissions`, `ProjectDTO.suspended` (Task 3).
- Produces:
  - `projects.ts`: `export async function deleteProjectCascade(p: WithId<ProjectRow>): Promise<void>` — `records` va `payments` (`projectId: hex`), `counters` (`_id` `^<hex>:` regex), loyiha hujjati; `BOT_TOKEN` bo'lsa `tgApi(token, "deleteWebhook")` (xato yutiladi).
  - `export const SUSPENDED_TEXT = "Ilova vaqtincha to'xtatilgan"` (`projects.ts`).
  - `ProjectNav` yangi props: `suspended?: boolean; viaAdmin?: boolean; ownerEmail?: string | null`.

- [ ] **Step 1: Studio `readOnly = !project.permissions.update`.** `commit` funksiyasi `readOnly` da hech narsa qilmaydi (yagona o'zgartirish nuqtasi — buni saqlang); autosave effekti `readOnly` da ishga tushmaydi; keydown'da faqat `Escape` ishlaydi; AI prompt/comment paneli, Publish tugmasi, "ekran qo'shish" yashirin; `NodeInspector`/`AppInspector` ga `readOnly` prop → hamma input'lar `<fieldset disabled>` ichida; `Layers` da `draggable={!readOnly && !isScreen}` va `onDrop` o'chiq. Yuqorida "Faqat ko'rish" belgisi. Preview ("Sinash") va tanlash ishlaydi.
- [ ] **Step 2: Bannerlar** `ProjectNav` da: `suspended` → "Loyiha administrator tomonidan to'xtatilgan"; `viaAdmin` → "Admin rejimi: siz <ownerEmail ?? 'egasiz'> loyihasidasiz". Studio, sozlamalar, ma'lumotlar sahifalari bularni DTO'dan uzatadi (`ownerEmail` uchun `GET [id]` javobiga ega emailini qo'shing).
- [ ] **Step 3: To'xtatish ochiq yo'llarda:** `GET /api/rt/[slug]` va `POST /api/rt/[slug]/action` → `p.suspended` bo'lsa `fail(SUSPENDED_TEXT, 423)`; bot webhook `/start` → `SUSPENDED_TEXT` matni, web_app tugmasiz. `/api/pay/*` ga **tegilmaydi**. `MiniApp.tsx` 423 xatosini avvalgidek matn sifatida ko'rsatadi (o'zgarish kerak emas — tekshiring).
- [ ] **Step 4: O'chirish kaskadi:** `DELETE [id]` `deleteProjectCascade` ni chaqiradi. Dashboard tasdig'i `confirm` o'rniga `prompt("O'chirish uchun loyiha nomini yozing: <name>")` — mos kelmasa bekor.
- [ ] **Step 5:** `npm test`, tsc, eslint toza.
- [ ] **Step 6: Qo'lda:** `read` a'zo studio'da ⌘Z, Del, drag, inspektor — hech narsa o'zgarmaydi; Network'da PATCH so'rovi yo'q. Mongo'da qo'lda `suspended: { at: new Date(), by: "x" }` qo'yib: `/app/<slug>` → "Ilova vaqtincha to'xtatilgan"; Click callback (to'g'ri sign bilan, `pending` to'lov uchun) avvalgidek `error: 0` qaytaradi. Loyihani o'chirish → `records`/`payments`/`counters` da shu loyiha qoldig'i yo'q.
- [ ] **Checkpoint.**

---

### Task 6: AI ishlatilishini hisoblash

**Files:**
- Create: `src/lib/server/usage.ts`, `test/usage.test.ts`
- Modify: `src/lib/server/ai.ts`, `src/app/api/projects/[id]/ai/route.ts`, `src/lib/server/db.ts` (indeks `usage: {userId:1, at:-1}`, `{projectId:1, at:-1}`)

**Interfaces:**
- Produces:
  ```ts
  // ai.ts
  export interface Usage { inputTokens: number; outputTokens: number; model: string; mock: boolean }
  export async function generateApp(prompt: string, envHints: string[], projectName?: string): Promise<{ doc: AppDoc; usage: Usage }>;
  export async function editApp(doc: AppDoc, comment: string, nodeId?: string | null): Promise<EditResult & { usage: Usage }>;
  // usage.ts
  export function addUsage(a: Usage, b: { input_tokens: number; output_tokens: number }): Usage; // sof
  export async function recordUsage(e: { userId: string; projectId: string; kind: "generate" | "edit"; usage: Usage }): Promise<void>; // usage.mock bo'lsa yozmaydi
  export async function usageTotals(by: "userId" | "projectId", ids: string[]): Promise<Map<string, { requests: number; inputTokens: number; outputTokens: number }>>;
  ```
- [ ] **Step 1: Muvaffaqiyatsiz test:** `addUsage({ inputTokens: 10, outputTokens: 5, model: "m", mock: false }, { input_tokens: 3, output_tokens: 2 })` → `{ inputTokens: 13, outputTokens: 7, model: "m", mock: false }`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** `callTool` har bir urinishda `res.usage` ni `addUsage` bilan yig'adi va `{ value, usage }` qaytaradi; mock yo'llari `mock: true`, nol tokenlar. AI route `recordUsage` chaqiradi; `perms.viaAdmin` bo'lsa audit `ai.generate`/`ai.edit`. Javob shakli (`{ doc, message }` / `EditResult`) klient uchun o'zgarmaydi — `usage` javobga qo'shilmaydi.
- [ ] **Step 4:** `npm test` → PASS; tsc, eslint.
- [ ] **Checkpoint.**

---

### Task 7: Platforma admini (API + `/admin`)

**Files:**
- Create: `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/admin/projects/route.ts`, `src/app/api/admin/projects/[id]/route.ts`, `src/app/api/admin/audit/route.ts`, `src/app/admin/page.tsx`
- Modify: `src/lib/server/access.ts` (agar kerak bo'lsa `getAuthContext`)

**Interfaces:**
- Consumes: `requireAdmin`, `isPlatformAdmin` (Task 2); `audit` (Task 3); `usageTotals` (Task 6); `normalizeEmail`.
- Produces (hammasi `requireAdmin`; ro'yxatlar `?q=` va `?page=` (1 dan), sahifa hajmi 50, javob `{ items, total, page }`):
  - `GET /api/admin/users` → item: `{ id, email, name, image, createdAt, banned, isAdmin, projects: number, usage: { requests, inputTokens, outputTokens } }`; `q` email/ism bo'yicha (regex, escape qilingan).
  - `PATCH /api/admin/users/[id]` body `{ banned: boolean }` — o'zini yoki boshqa platforma adminini bloklash → 400 "Adminni bloklab bo'lmaydi"; `banned: true` da `(await auth.$context).internalAdapter.deleteSessions(id)`; audit `user.ban`/`user.unban`.
  - `GET /api/admin/projects` → item: `{ _id, name, slug, owner: { id, email } | null, members: number, publishedVersion, suspended: boolean, updatedAt, usage }`; `?ownerless=1` filtri.
  - `PATCH /api/admin/projects/[id]` body bittasi: `{ suspended: true, reason?: string }` | `{ suspended: false }` | `{ ownerEmail: string }` — oxirgisi faqat `ownerId` yo'q loyiha uchun (aks holda 400 "Loyihaning egasi bor"), email `user` kolleksiyasida bo'lmasa 404 "Bunday foydalanuvchi yo'q"; audit `project.suspend`/`project.unsuspend`/`project.assignOwner`.
  - `GET /api/admin/audit` → item = `AuditEntry & { _id, at }`, `?projectId=`, `?actorId=` filtrlari.
- [ ] **Step 1: Guard testi** (Task 3 dagi) admin fayllarini qamrab olganini tekshiring: `npm test` — admin route'larini yozishdan oldin guard'siz bo'sh fayl qo'yib FAIL ko'ring, so'ng yozing.
- [ ] **Step 2: Beshta route fayl.**
- [ ] **Step 3: `/admin` sahifasi** (client): tablar "Foydalanuvchilar" / "Loyihalar" / "Jurnal"; qidiruv, sahifalash; foydalanuvchi qatorida "Bloklash"/"Blokdan chiqarish" (tasdiq bilan); loyiha qatorida "Ochish" (`/projects/<id>/studio`), "To'xtatish"/"Yoqish" (sabab so'raladi), egasiz loyihada "Ega tayinlash" (email so'raladi); AI ustuni "so'rovlar · kirish/chiqish tokenlari". Admin emas bo'lsa API 404 → sahifa "Topilmadi".
- [ ] **Step 4:** `npm test`, tsc, eslint toza.
- [ ] **Step 5: Qo'lda:** admin akkaunt `/admin` ni ochadi, oddiy akkaunt → "Topilmadi". Admin B ni bloklaydi → B ning ochiq tabida keyingi so'rov 401, qayta kirish → `/login?error=1`. Admin o'zini bloklashga urinadi → 400. Admin A loyihasini studio'da ochadi → "Admin rejimi" banneri, "Jurnal"da `project.view`; tahrirlaydi → `project.update`. Egasiz loyihaga A emailini tayinlash → A ro'yxatida paydo bo'ladi.
- [ ] **Checkpoint.**

---

## Bajarilish tartibi

1 → 2 → 3 → 4 → 5 → 6 → 7. Task 4–6 faqat Task 3 ga bog'liq va bir-biriga tegmaydi (5 va 4 ikkalasi `projects.ts` ga qo'shadi — ketma-ket bajaring).
