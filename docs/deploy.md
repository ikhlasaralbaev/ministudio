# MiniStudio'ni serverga joylash (Aral Cloud)

Natija: doimiy `https://…` manzil. Telegram webhook, mini app va Google login shu manzilda ishlaydi, kompyuteringiz o'chiq bo'lsa ham.

## 1. Server

Tavsiya: **2 vCPU · 4 GB RAM · 40 GB disk**, Ubuntu 24.04 (ilova + MongoDB uchun yetarli; keyin `resize` bilan kattalashtirsa bo'ladi).

```bash
aral server quote --vcpu 2 --ram 4 --disk 40 --zone <zona>     # narxni ko'rish
aral server create --name ministudio --vcpu 2 --ram 4 --disk 40 \
  --region <zona> --os-image ubuntu-24.04 --ssh-key "$(cat ~/.ssh/id_ed25519.pub)"
aral server get <id>                                           # status "active" bo'lguncha (~2 daqiqa)
```

## 2. Docker o'rnatish (serverda)

```bash
aral ssh <id>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # qayta kiring
```

## 3. Kodni yuborish

Lokal kompyuterdan (loyiha papkasida):

```bash
rsync -az --delete --exclude node_modules --exclude .next --exclude .env.local --exclude .superpowers \
  -e "$(aral server ssh <id> | sed 's/^ssh /ssh /; s/ ubuntu@.*//')" ./ ubuntu@<host>:ministudio/
```

(Yoki loyihani GitHub'ga joylab, serverda `git clone` / `git pull` qiling.)

## 4. Domen va `.env.production`

```bash
aral server domain list <id>      # platforma bergan https domen
```

Serverda:

```bash
cd ministudio
cp .env.production.example .env.production
nano .env.production
```

- `PUBLIC_URL` va `BETTER_AUTH_URL` = domen (`https://…`, oxirida `/` siz).
- `APP_SECRET`: **lokaldagi bilan bir xil** qo'ying, agar mavjud loyihalar (bot tokenlari shifrlangan) ko'chirilsa. Yangi boshlansa — yangi tasodifiy qiymat.
- `BETTER_AUTH_SECRET`: yangi tasodifiy qiymat (`openssl rand -hex 32`).
- Google Cloud Console → OAuth client → **Authorized redirect URIs** ga `https://<domen>/api/auth/callback/google` qo'shing.

## 5. Ishga tushirish

```bash
docker compose up -d --build
docker compose logs -f app        # "Ready" chiqishi kerak
```

Ilova serverning 80-portida. Brauzerda `https://<domen>` → login sahifasi.

## 6. Botlarni yangi manzilga ulash

Studio'da har bir loyiha uchun **Publish** bosing — webhook va menyu tugmasi yangi domenga o'tadi.

## Yangilash

```bash
# kodni qayta yuboring (3-qadam), keyin serverda:
docker compose up -d --build
```

## Zaxira nusxa (backup)

```bash
docker compose exec mongo mongodump --archive --gzip > backup-$(date +%F).gz
# tiklash:
docker compose exec -T mongo mongorestore --archive --gzip --drop < backup-YYYY-MM-DD.gz
```

## Lokal ma'lumotlarni ko'chirish (ixtiyoriy)

Lokal (`sahna-mongo-1` ichidagi `ministudio` bazasi):

```bash
docker exec sahna-mongo-1 mongodump --db ministudio --archive --gzip > ministudio.gz
```

Serverga yuborib: `docker compose exec -T mongo mongorestore --archive --gzip < ministudio.gz`.
Bunda `APP_SECRET` lokaldagi bilan bir xil bo'lishi shart.

## CI/CD (GitHub Actions)
`.github/workflows/ci-cd.yml`: every push and pull request runs types, lint, tests (with a MongoDB service, so the
integration tests run too) and the production build. A push to `main` that passes CI then deploys through
`deploy/deploy.sh` (the `production` environment). Pull requests never deploy.

Repository secrets (Settings → Secrets and variables → Actions):
- `DEPLOY_SSH_KEY`: private key of a dedicated deploy key (its public half in the server's `~/.ssh/authorized_keys`)
- `DEPLOY_KNOWN_HOSTS`: the server's host key line, e.g. `ssh-keyscan -p 27943 157.180.5.110`
- `ENV_PRODUCTION`: full contents of `.env.production`
- `DEPLOY_HOST`, `DEPLOY_PORT` (optional, override the defaults in `deploy.sh`)

## Manager bot (create a project's bot from the platform)
Optional. Lets a user create the Telegram bot for a project with one confirmation in Telegram instead of using
BotFather (Telegram "Managed Bots", Bot API 9.6). The flow also asks the user to link their Telegram account first
(they open the manager bot through a one-time link, press Start and confirm), so the platform can match the created
bot to the right account. No login widget and no `/setdomain` are needed.

1. In BotFather create one bot for the platform and enable **Bot Management Mode** for it.
2. Add `TELEGRAM_MANAGER_BOT_TOKEN` and `TELEGRAM_MANAGER_BOT_USERNAME` to `.env.production` (and to the
   `ENV_PRODUCTION` GitHub secret, otherwise the next automatic deploy removes them), then deploy.
3. Admin page → "Manager bot" → *Webhook o'rnatish va tekshirish*. It must report that bot management is enabled.

Not verified against the official docs when written: the exact `t.me/newbot/<manager>/<username>?name=` link format
and the name of the update field (`managed_bot`). Both live in one place each (`newBotLink`, the manager webhook route),
so they are easy to adjust after a first real test. The manager token can fetch and replace the token of every bot made
through it: keep it as secret as `APP_SECRET`.

### Manager bot as a chat console and Telegram sign-in
After the one-time Google sign-in and "Telegramni ulash" on the site, the manager bot works as a console:
`/start` menu, `/projects`, `/new`, `/language`, then plain-language prompts to the AI (generate, then edit), Publish, the latest
orders and "create the bot" - all as that account, with its project rights. The "Site" buttons are plain links to the
website (the panel no longer opens inside Telegram). A person who only has a Telegram-made account signs in on the site
with Google and presses "Telegramni ulash": the two accounts merge. The `/tg` page (Mini App `initData` sign-in) is
still in the code but nothing in the bot opens it.

After deploying this, press *Webhook o'rnatish va tekshirish* in the admin page once more: it also sets the bot's
command menu and resets the menu button (the old "Panel" Mini App button goes away).

The manager bot's messages are HTML-formatted and in Russian by default; `/language` switches a Telegram user to
Uzbek, English or Karakalpak (kept in `manager_prefs`). Texts live in `src/lib/managerI18n.ts`; every dynamic value is
HTML-escaped before it goes into a message.

## Images: logos and references
Uploaded images live in the MongoDB `assets` collection (so `deploy/backup.sh` backs them up). They are decoded and
re-encoded with `sharp` on upload: logos → PNG ≤ 512px (transparency kept), references → JPEG ≤ 1568px, metadata stripped,
5 MB upload limit, SVG refused. A project keeps one logo (a new one replaces it) and at most 8 references (oldest go first).
`GET /api/assets/<id>`: logos are public (the published mini app shows them), references need access to the project.
References go to the AI as vision input (max 5 per request, a few thousand tokens each); the logo is described to the AI
(address, size, dominant color). In the manager bot, a photo asks "logo or reference" (Telegram's 20 MB download limit applies
first; photos are staged for 24 h while waiting for the answer). `sharp` is a direct dependency and listed in
`serverExternalPackages`; the Docker image installs its Linux binary through `npm ci`.


## Credits (balance)
Every AI request spends credits: 1 credit = $0.01 of model cost (a typical Sonnet app is ~5-10 credits, a small Haiku edit ~1).
A new account gets `FREE_CREDITS` (default 100) the first time its balance is read; platform admins (`SUPER_ADMIN_EMAILS`) are not
metered. `CREDIT_MARKUP` (default 1) multiplies the cost. With no credits left a request is refused (HTTP 402, and a message in
the bot). The balance and history are on `/billing`; an admin adds credits per user in the admin page ("Kredit"). Online
top-up (Click/Payme for the platform itself) is not built yet: it needs a merchant account for MiniStudio. Everything lives in
the `credit_balances` and `credit_ledger` collections, so a payment only has to call `addCredits(userId, credits, "topup", ...)`.

## Other new settings
`NOTIFY_AFTER_MS` (default 20000): AI jobs longer than this are announced in Telegram when no page is watching.
Browser login through Telegram needs the manager bot (`TELEGRAM_MANAGER_BOT_TOKEN` / `_USERNAME`).

## Translations of the inner pages
Interface texts of Studio, settings, data, admin and so on are written in Uzbek in the code and translated through a catalog:
`x("Uzbek text")` (hook `useX()`) returns the text in the active language (uz, kaa, en, ru); a missing entry falls back to Uzbek.
Module-level constants use the marker `T("...")` and are translated where shown with `x(...)`. Catalog files: `src/i18n/x/*.ts`.
Messages the server sends in errors are translated in the browser by `translateServer()` (`src/i18n/x/server.ts`).
`test/i18n-x.test.ts` fails when a text in the code has no kaa/en/ru translation, when `{placeholders}` differ, or when a catalog entry is unused.
Content written by the owner (screen names, app texts, bot texts) is never translated.
