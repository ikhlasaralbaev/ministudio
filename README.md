# MiniStudio — promptdan Telegram Mini App'gacha

Admin panelda loyiha yaratasiz → bot token va to'lov kalitlarini kiritasiz → prompt yozasiz → AI ilovani chizadi →
Figma'dagidek elementni bosib **comment** orqali dizayn va logikani o'zgartirasiz → **Publish** → bot'da ishlaydi.

## Ishga tushirish

```bash
cp .env.example .env.local      # qiymatlarni to'ldiring
npm install
npm run dev                     # http://localhost:3000
```

Kerak bo'ladi:
- **MongoDB** (`brew install mongodb-community` yoki Docker: `docker run -d -p 27017:27017 mongo:8`)
- **ANTHROPIC_API_KEY**. Kalitsiz ishga tushirilsa demo rejim ishlaydi: tayyor kafe shabloni va oddiy rang/o'lcham buyruqlari.
- **Google OAuth client**: Google Cloud Console → Credentials → OAuth client ID (Web application),
  redirect URI `<PUBLIC_URL>/api/auth/callback/google`. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `SUPER_ADMIN_EMAILS` ni to'ldiring.
- **PUBLIC_URL** (https). Telegram faqat https qabul qiladi. Lokalda: `ngrok http 3000`, keyin `PUBLIC_URL=https://xxxx.ngrok.app`.

## Oqim

1. **Loyihalar** (`/`): yangi loyiha yaratish.
2. **Sozlamalar**: `BOT_TOKEN` (getMe bilan tekshiriladi), `OWNER_CHAT_ID`, Click/Payme kalitlari, istalgan custom env. Hammasi AES-256-GCM bilan shifrlanadi (`APP_SECRET`).
3. **Studio**:
   - bo'sh loyihada prompt yozasiz, AI butun ilovani yaratadi (ekranlar, state, kolleksiyalar, logika);
   - canvas'da elementni bosasiz, yonida comment oynasi ochiladi; AI faqat shu elementga **patch** qaytaradi;
   - pastdagi satr butun ilova bo'yicha buyruqlar uchun (yangi ekran, umumiy dizayn);
   - qo'lda tahrirlash: Qatlamlar (drag & drop), Inspektor (props, stil, ko'rinish sharti, logika JSON), mavzu, state, kolleksiyalar;
   - ⌘Z / ⇧⌘Z, ⌘D (nusxa), Del, Esc, Enter (comment'ga fokus);
   - **▶ Sinash**: ilova xuddi Telegram'dagidek ishlaydi (server amallari simulyatsiya qilinadi).
4. **Publish**: snapshot olinadi (versiya bilan, oxirgi 20 tasi saqlanadi), `setWebhook`, `setChatMenuButton` va `setMyCommands` chaqiriladi.
   Bot `/start` ga Web App tugmasi bilan javob beradi. Egani ulash: Sozlamalar sahifasidagi `t.me/<bot>?start=owner_...` havolasi.
5. **Ma'lumotlar**: buyurtmalar (`records` kolleksiyalar) va to'lovlar.

## Arxitektura

```
src/lib/types.ts        AppDoc / Node / Action / Op sxemalari (zod)
src/lib/spec.ts         AI uchun "til" tavsifi (komponentlar, ifodalar, action'lar, op'lar)
src/lib/expr.ts         xavfsiz ifoda baholovchi (jsep AST + whitelist helperlar)
src/lib/doc.ts          applyOps: update / insert / delete / move / replace ...
src/components/runtime.tsx  YAGONA renderer + action engine (studio va publish qilingan ilova uchun bitta)
src/components/studio/  Studio: canvas, comment, qatlamlar, inspektor
src/lib/server/ai.ts    Anthropic tool-use: generate (to'liq doc) va edit (op'lar), zod + lint, xatoda qayta urinish
src/app/api/...         projects, env, ai, publish, records, bot webhook, runtime (rt), click, payme
```

Muhim qarorlar:
- **AI kod yozmaydi.** U JSON hujjat yoki op'lar qaytaradi. Ular validatsiya qilinadi (zod, ifodalar parse qilinadi, navigate maqsadlari tekshiriladi). Noto'g'ri bo'lsa xato matni AI'ga qaytariladi va u tuzatadi.
- **Logika = action DSL** (`setState`, `append`, `navigate`, `if`, `dbInsert`, `notifyOwner`, `pay`, `haptic`...). `eval` yo'q.
- Server amallari (`/api/rt/[slug]/action`) Telegram `initData` HMAC'ini tekshiradi va oddiy rate limit qo'llaydi.
  Productionda bot ulanmagan ilova uchun server amallari o'chiq (`ALLOW_ANONYMOUS_ACTIONS=1` bilan yoqiladi).
- **To'lov summasiga klientdan ishonilmaydi.** Server publish qilingan `pay.amount` ifodasini qayta hisoblaydi;
  state'dagi `id` si statik kolleksiyaga mos obyektlarning maydonlari (narx, nom...) katalogdagi qiymat bilan almashtiriladi,
  manfiy sonlar rad etiladi. `dbInsert` ma'lumotidagi katalog maydonlari ham shunday tozalanadi.
- **Kirish**: Google (Better Auth). Har bir loyihaning egasi va ruxsatli a'zolari bor (`read` / `update`,
  "A'zolarni boshqarish", "Loyihani o'chirish"). Platforma adminlari `SUPER_ADMIN_EMAILS` orqali belgilanadi va `/admin` sahifasini ko'radi.
  Ruxsatlar `src/lib/permissions.ts`, tekshiruv har bir API'da `src/lib/server/access.ts` orqali.

## To'lovlar

- **Click**: `pay` amali to'lov havolasini yaratadi. Click kabinetida Prepare va Complete URL: `PUBLIC_URL/api/pay/click/<projectId>` (md5 imzo tekshiriladi).
- **Payme**: checkout havolasi + Merchant API (JSON-RPC: Check/Create/Perform/Cancel/CheckTransaction, GetStatement). Endpoint: `PUBLIC_URL/api/pay/payme/<projectId>`, `PAYME_KEY` bilan Basic auth.
- To'lov tasdiqlanganda egasiga Telegram xabar boradi.

## Production'dan oldin (TODO)

- [ ] To'lov summasi hozir klientdan keladi. Uni serverda buyurtma (records) asosida hisoblash kerak.
- [ ] Admin uchun to'liq auth va multi-tenant (hozir faqat `ADMIN_PASSWORD` Basic auth).
- [ ] Rate limit'ni Redis'ga ko'chirish (hozir xotirada, bitta process uchun).
- [ ] Click/Payme integratsiyasini ularning sandbox muhitida sinash.
- [ ] Rasm yuklash (S3/R2), hozir faqat URL.
- [ ] Versiyalar orasida rollback UI (history Mongo'da saqlanyapti).
- [ ] AI uchun streaming va jarayon ko'rsatkichi.
