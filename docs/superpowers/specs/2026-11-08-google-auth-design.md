# MiniStudio: Google auth, jamoalar va platforma admini — dizayn

Sana: 2026-11-08 · Holat: tasdiqlash kutilmoqda

## 1. Maqsad va sabab

MiniStudio hamma uchun ochiq SaaS bo'ladi: istalgan odam Google akkaunti bilan kirib, o'z Telegram Mini App'larini quradi.
Hozir tizimda foydalanuvchi tushunchasi yo'q: admin panel bitta umumiy parol (`ADMIN_PASSWORD`, HTTP Basic) bilan himoyalangan,
loyihalarning egasi yo'q, parolni bilgan har kim hamma loyihani, bot tokenlarini, buyurtma va to'lovlarni ko'radi.

Bu ish uchta narsani qo'shadi:
1. **Google orqali kirish** va foydalanuvchilar.
2. **Loyiha egaligi va jamoa**: loyihaga boshqa foydalanuvchilarni ruxsatlar bilan qo'shish.
3. **Platforma admini**: platforma egasi hamma foydalanuvchi va loyihalarni ko'radi va boshqaradi.

Hozircha hamma funksiyalar bepul. Tariflar va limitlar keyin qo'shiladi, shuning uchun AI ishlatilishi hozirdanoq hisoblanib boriladi
(lekin hech narsa bloklanmaydi).

## 2. Maqsadlar

- Foydalanuvchi Google bilan kiradi, chiqadi; kirmagan odam admin qismga (loyihalar, studio, sozlamalar, ma'lumotlar, API) kira olmaydi.
- Loyihani yaratgan foydalanuvchi uning **egasi**. Ega hamma narsani qila oladi va uni cheklab yoki olib tashlab bo'lmaydi.
- Ega (yoki "a'zolarni boshqarish" huquqi bor a'zo) loyihaga email bo'yicha odam qo'shadi va ruxsat beradi:
  - **Asosiy dostup** (bittasi): `read` — hamma narsani ko'radi, hech narsani o'zgartirmaydi;
    `update` — to'liq ish: tahrirlash, AI, publish, bot/to'lov kalitlari.
  - **Qo'shimcha huquqlar** (katakchalar): `manageMembers` — a'zo qo'shish/o'chirish/ruxsatini o'zgartirish;
    `deleteProject` — loyihani o'chirish.
- Qo'shilgan odam Google bilan kirgan bo'lishi kerak. Hali ro'yxatdan o'tmagan bo'lsa, taklif email bo'yicha kutib turadi va
  u birinchi marta kirganda loyiha uning ro'yxatida paydo bo'ladi.
- Foydalanuvchi faqat o'zi a'zo bo'lgan loyihalarni ko'radi. Begona loyiha ID'si bilan har qanday sahifa yoki API "topilmadi" (404) qaytaradi.
- `read` a'zo uchun studio faqat ko'rish rejimida ochiladi; server ham har bir yozish so'rovini rad etadi.
- **Platforma admini** (`SUPER_ADMIN_EMAILS` dagi email'lar) `/admin` sahifasida:
  - foydalanuvchilar ro'yxati, qidiruv, har birining loyihalari soni va AI ishlatilishi; bloklash / blokdan chiqarish;
  - hamma loyihalar ro'yxati; istalgan loyihaga ega kabi kirish (studio, sozlamalar, ma'lumotlar), tahrirlash, publish,
    a'zolarni o'zgartirish, o'chirish; publish qilingan ilovani to'xtatish / qayta yoqish;
  - AI ishlatilishi (kim, qaysi loyihada, nechta so'rov, nechta token);
  - admin harakatlari jurnali.
- Publish qilingan mini app'lar, bot webhook'lari va Click/Payme callback'lari avvalgidek login talab qilmaydi.

## 3. Maqsad emas (hozircha qilinmaydi)

- Tariflar, limitlar, to'lov olish (faqat hisoblash bor).
- Loyiha egaligini boshqaga o'tkazish.
- Google'dan boshqa kirish usullari (email/parol, Telegram login).
- "Tashkilot/jamoa" alohida obyekt sifatida — a'zolik har bir loyihada alohida.
- Secretlarni (bot token, to'lov kalitlari) to'liq ko'rsatish — hech kimga, jumladan adminga ham.
- Mini app mijozlarining (Telegram foydalanuvchilari) autentifikatsiyasi — u o'zgarmaydi (`initData`).

## 4. Anti-maqsadlar (texnik ishlasa ham muvaffaqiyatsizlik hisoblanadi)

- Bir foydalanuvchi boshqasining loyihasini, secretlarini, buyurtma yoki to'lovlarini biror yo'l bilan ko'ra olsa (sahifa, API, ro'yxat, xato matni).
- `read` a'zo biror API orqali biror narsani o'zgartira olsa.
- `manageMembers` huquqi bor a'zo o'ziga yoki boshqaga o'zida yo'q huquqni bera olsa yoki egani o'zgartira olsa.
- Admin begona loyihada iz qoldirmasdan ish qila olsa.
- Bu o'zgarish tufayli allaqachon publish qilingan mini app'lar mijozlar uchun ishlamay qolsa.
- Bloklangan foydalanuvchi mavjud sessiyasi bilan ishlashda davom eta olsa.

## 5. Cheklovlar va mavjud holat

- Stack: Next.js 16 (App Router, `src/proxy.ts`), React 19, MongoDB driver 7, TypeScript, zod 4. UI matnlari o'zbekcha.
- Admin API'lar: `src/app/api/projects/**`. Sahifalar: `/`, `/projects/[id]/{studio,settings,data}` — barchasi client komponentlar,
  ma'lumotni `/api/...` dan oladi.
- Ochiq yo'llar (o'zgarmaydi): `/app/*`, `/api/rt/*`, `/api/bot/*`, `/api/pay/*`.
- `ADMIN_PASSWORD` bilan HTTP Basic himoya (`src/proxy.ts`) olib tashlanadi va Google sessiyasi bilan almashtiriladi.
- Bazada egasiz loyihalar bor.

## 6. Qabul qilingan qarorlar

### 6.1 Kutubxona: Better Auth *(quruvchining emas, mening tanlovim)*
- `better-auth` (npm `latest` 1.7.x; peer: `next ^16`, `mongodb ^7`) Google provider va MongoDB adapteri bilan.
  Auth.js v5 hali beta, uning MongoDB adapteri `mongodb ^6` talab qiladi — shuning uchun tanlanmadi.
- Better Auth'ning **admin plugin**i (ban/unban, sessiyalarni bekor qilish) bloklash uchun ishlatilishi mumkin — quruvchi hal qiladi.
- Yangi env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `SUPER_ADMIN_EMAILS` (vergul bilan),
  base URL `PUBLIC_URL` dan olinadi. `ADMIN_PASSWORD` olib tashlanadi. `.env.example` va README yangilanadi.
- Google callback URL: `<PUBLIC_URL>/api/auth/callback/google` — README'da Google Cloud Console sozlash bo'yicha qisqa yo'riqnoma.

### 6.2 Ma'lumotlar modeli
- **Foydalanuvchilar**: Better Auth kolleksiyalari (user, session, account, verification). Faqat Google'da tasdiqlangan email qabul qilinadi.
- **Platforma admini** bazada saqlanmaydi: har so'rovda `user.email` `SUPER_ADMIN_EMAILS` da borligi tekshiriladi (kichik harflarda).
- **Loyiha** (`projects`) ga qo'shiladi:
  ```ts
  ownerId: string | null;          // user id; null = egasiz (eski loyihalar)
  members: {
    userId: string | null;         // null = taklif hali qabul qilinmagan
    email: string;                 // kichik harfda; takliflar shu bo'yicha bog'lanadi
    access: "read" | "update";
    manageMembers: boolean;
    deleteProject: boolean;
    addedBy: string;               // user id
    addedAt: Date;
  }[];
  suspended?: { at: Date; by: string; reason?: string };   // admin to'xtatgan
  ```
  Indekslar: `{ ownerId: 1 }`, `{ "members.userId": 1 }`, `{ "members.email": 1 }`. Bitta loyihada a'zolar soni ≤ 50.
- **AI ishlatilishi** (`usage`): `{ userId, projectId, kind: "generate" | "edit", inputTokens, outputTokens, model, at }` —
  har bir haqiqiy (mock bo'lmagan) AI chaqiruvidan keyin yoziladi; qayta urinishlar tokenlari ham qo'shiladi.
- **Jurnal** (`audit`): `{ actorId, actorEmail, asAdmin: boolean, action, projectId?, targetUserId?, targetEmail?, details?, at }`.
  Yoziladigan hodisalar: a'zo qo'shish/o'zgartirish/o'chirish, loyihani o'chirish, publish, env o'zgarishi (faqat kalit nomlari),
  foydalanuvchini bloklash/ochish, loyihani to'xtatish/yoqish, adminning **begona** loyihadagi har qanday yozish amali
  va adminning begona loyihaga kirishi (bir sessiyada loyiha boshiga bir marta yetarli).

### 6.3 Ruxsatlar
Samarali ruxsat bitta funksiyada hisoblanadi va hamma joyda ishlatiladi:

| Kim | read | update | manageMembers | deleteProject |
|---|---|---|---|---|
| Ega | ✓ | ✓ | ✓ | ✓ |
| A'zo `read` | ✓ | — | belgilansa | belgilansa |
| A'zo `update` | ✓ | ✓ | belgilansa | belgilansa |
| Platforma admini | ✓ | ✓ | ✓ | ✓ |
| Boshqalar | 404 | 404 | 404 | 404 |

- A'zo bo'lmagan foydalanuvchiga loyiha bor-yo'qligi oshkor qilinmaydi: har doim 404. A'zo, lekin ruxsati yetmasa: 403.
- **Huquq oshirish taqiqi** (`manageMembers` bo'yicha):
  - faqat o'zida bor huquqni bera oladi (`read` a'zo boshqaga `update` bera olmaydi; `deleteProject` i yo'q odam uni bera olmaydi);
  - o'zidan kuchliroq a'zoni o'zgartira yoki o'chira olmaydi;
  - egani hech kim o'zgartira olmaydi; ega a'zolar ro'yxatida emas, `ownerId` da;
  - o'z ruxsatini oshira olmaydi; lekin istalgan a'zo o'zini loyihadan chiqarib yuborishi (leave) mumkin.
  - Platforma admini bu cheklovlarga bo'ysunmaydi (lekin egani ham o'zgartirmaydi — egalik o'tkazish yo'q).
- **Secretlar**: env GET hammaga (adminga ham) avvalgidek maskalangan qiymat qaytaradi.
  `ownerLink` (bot egasini ulash havolasi, `OWNER_CHAT_ID` ni o'zgartiradi) faqat `update` huquqi borlarga qaytariladi.

### 6.4 Har bir marshrut

| Marshrut | Talab |
|---|---|
| `GET /api/projects` | kirgan foydalanuvchi; ega yoki a'zo bo'lgan loyihalar + har biriga uning samarali ruxsati |
| `POST /api/projects` | kirgan foydalanuvchi; `ownerId` = u |
| `GET /api/projects/[id]` | read; javobga samarali ruxsat (`permissions`) va `isOwner` qo'shiladi |
| `PATCH /api/projects/[id]` | update |
| `DELETE /api/projects/[id]` | deleteProject |
| `GET /api/projects/[id]/records` | read |
| `GET /api/projects/[id]/env` | read (`ownerLink` faqat update bilan) |
| `PUT /api/projects/[id]/env` | update |
| `POST /api/projects/[id]/publish` | update; to'xtatilgan loyihani faqat admin publish qila oladi |
| `POST /api/projects/[id]/ai` | update; `usage` ga yoziladi |
| **yangi** `GET/POST /api/projects/[id]/members`, `PATCH/DELETE /api/projects/[id]/members/[memberKey]` | ro'yxat: read; o'zgartirish: manageMembers (o'zini chiqarish: har kim) |
| **yangi** `/api/admin/**` | platforma admini |
| `/api/auth/**` | Better Auth (ochiq) |
| `/app/*`, `/api/rt/*`, `/api/bot/*`, `/api/pay/*` | ochiq, o'zgarmaydi — faqat `suspended` tekshiruvi qo'shiladi (6.6) |

`src/proxy.ts`: sessiya cookie yo'q bo'lsa sahifalar `/login` ga yo'naltiriladi, API 401 qaytaradi (tezkor, optimistik tekshiruv).
**Haqiqiy** tekshiruv har bir route handler'da sessiya + ruxsat orqali — proxy'ga tayanilmaydi.

### 6.5 Bloklash
- Bloklangan foydalanuvchining hamma sessiyalari darhol bekor qilinadi, qayta kira olmaydi, har qanday admin API 403 qaytaradi.
- Uning publish qilingan ilovalari ishlashda davom etadi (mijozlar jabr ko'rmasin). Kerak bo'lsa admin loyihani alohida to'xtatadi.
- Admin o'zini va boshqa platforma adminini bloklay olmaydi.

### 6.6 Loyihani to'xtatish (admin)
- `suspended` o'rnatilsa: `GET /api/rt/[slug]` va `POST /api/rt/[slug]/action` "Ilova vaqtincha to'xtatilgan" qaytaradi;
  bot `/start` ga shu matn bilan javob beradi; Click/Payme callback'lari **ishlashda davom etadi**
  (boshlangan to'lovlar to'g'ri yakunlansin).
- Studio va loyiha sahifalarida a'zolarga "Loyiha administrator tomonidan to'xtatilgan" banneri ko'rinadi.

### 6.7 Loyihani o'chirish
- O'chirishda loyihaga tegishli `records`, `payments`, `counters` (`<projectId>:*`) ham o'chiriladi,
  bot token bo'lsa `deleteWebhook` chaqiriladi (xato bo'lsa e'tiborsiz qoldiriladi). Jurnalga yoziladi.
- UI'da tasdiqlash: loyiha nomini qayta yozish.

### 6.8 Egasiz (eski) loyihalar
- Migratsiya kerak emas: `ownerId` yo'q/`null` loyihalarni faqat platforma adminlari ko'radi.
- Admin sahifasida ular "Egasiz" belgisi bilan chiqadi va admin ularga ega tayinlay oladi (mavjud foydalanuvchi email'i bo'yicha).
  Bu — egalik o'tkazishning yagona holati va faqat egasiz loyiha uchun.

### 6.9 UI
- **`/login`**: logo, qisqa tavsif, "Google bilan kirish" tugmasi. Bloklangan bo'lsa tushunarli xabar.
- **Sarlavha** (dashboard va `ProjectNav`): avatar/email, "Chiqish"; admin uchun "Admin" havolasi.
- **Dashboard (`/`)**: "Mening loyihalarim" va "Men a'zo bo'lgan loyihalar" (rol belgisi bilan). Yaratish — hamma uchun.
- **Sozlamalar sahifasi**: yangi "A'zolar" bo'limi — email + asosiy dostup + ikki katakcha, ro'yxat, kutilayotgan takliflar
  ("kirishini kutmoqda"), o'chirish, "Loyihadan chiqish". Ruxsati bo'lmagan boshqaruvlar ko'rinmaydi yoki o'chirilgan holatda.
  `read` uchun env formasi faqat ko'rish rejimida.
- **Studio (`read`)**: yuqorida "Faqat ko'rish" belgisi; AI prompt va comment oynasi, inspektor maydonlari, qatlamlarni sudrash,
  klaviatura yorliqlari (⌘Z, ⌘D, Del), Publish yashirin yoki o'chirilgan; **autosave hech qachon ishlamaydi**.
  "Sinash" (preview) va elementlarni tanlab ko'rish ishlaydi.
- **`/admin`**: uchta tab — Foydalanuvchilar, Loyihalar, Jurnal. AI ishlatilishi foydalanuvchilar va loyihalar jadvalida ustun sifatida
  (jami so'rovlar va tokenlar) va bitta foydalanuvchi/loyiha sahifasida batafsil.
  Admin begona loyihaga kirganda yuqorida "Admin rejimi: siz <ega email> loyihasidasiz" banneri.

### 6.10 Tekshiruvdan keyin qo'shilgan qarorlar *(mening qarorlarim)*
- **Taklif xabari yuborilmaydi.** Email yuborish xizmati yo'q. A'zo qo'shilgach, UI kirish havolasini (`<PUBLIC_URL>/login`)
  nusxalash tugmasi bilan ko'rsatadi, ega uni o'zi yuboradi.
- **Bloklangan egasi bor loyihalar**: boshqa a'zolar ularda ishlashda davom etadi.
- **Admin dashboard'i (`/`)** oddiy foydalanuvchinikidek, faqat o'z loyihalari. Hamma loyihalar `/admin` da.
- **Email moslash**: hamma joyda kichik harfga o'tkazilib, bo'sh joylar olib tashlanib solishtiriladi.
  Bir xil email bilan ikkinchi marta qo'shish xato qaytaradi. Egani a'zo sifatida qo'shib bo'lmaydi.
- **Yangi kirgan foydalanuvchi**: kirish paytida `members.email` mos keladigan hamma takliflarga uning `userId` si yoziladi.

## 7. Quruvchiga qoldirilgan

- Better Auth sozlamalari tafsilotlari (cookie, sessiya muddati, admin plugin ishlatish-ishlatmaslik).
- `memberKey` formati (userId yoki taklif uchun email asosidagi kalit).
- Admin jadvallaridagi sahifalash (pagination) va qidiruv tafsilotlari.
- Fayllar tuzilishi: masalan `src/lib/server/auth.ts` (Better Auth), `src/lib/server/access.ts`
  (`requireUser()`, `requireProject(id, need)`, `isPlatformAdmin()`), `src/lib/server/audit.ts`.
- **Testlar**: loyihada test yo'q. Ruxsatlar matritsasi va huquq oshirish taqiqi uchun vitest bilan unit testlar qo'shish tavsiya etiladi
  (sof funksiya sifatida yozilsa, MongoDB'siz test qilinadi). Har bir API marshrutini `read`/`update`/begona/admin sifatida
  qo'lda yoki skript bilan tekshirish.

## 8. Ochiq qolgan, lekin bu ishga ta'sir qilmaydigan savollar

- Tariflar va limitlar (keyingi ish; `usage` kolleksiyasi shunga asos).
- DSL'ni kengaytirish (`dbQuery`, `notifyUser`, `onLoad` va hokazo) — alohida ish.
