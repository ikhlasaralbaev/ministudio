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
