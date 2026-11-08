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
