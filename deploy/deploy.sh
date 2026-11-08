#!/bin/sh
# Deploy MiniStudio to the Aral server: sync code + .env.production, install Docker once, (re)build and start.
#   sh deploy/deploy.sh            # deploy / update
# Needs: SSH key ~/.ssh/aral_ministudio authorized on the server.
set -eu

HOST="${DEPLOY_HOST:-ubuntu@157.180.5.110}"
PORT="${DEPLOY_PORT:-27943}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/aral_ministudio}"
DIR="ministudio"
SSH="ssh -i $KEY -p $PORT -o BatchMode=yes -o ConnectTimeout=20"

cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo "missing .env.production"; exit 1; }

echo "==> Docker (once)"
$SSH "$HOST" 'command -v docker >/dev/null || (curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker "$USER")'

echo "==> Sync code"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .superpowers --exclude .claude \
  --exclude '.env.local' --exclude '.env.local.*' --exclude test --exclude storage \
  -e "$SSH" ./ "$HOST:$DIR/"
$SSH "$HOST" "chmod 600 $DIR/.env.production"

echo "==> Build and start"
$SSH "$HOST" "cd $DIR && sudo docker compose up -d --build --remove-orphans && sudo docker image prune -f >/dev/null"

echo "==> Daily backup cron (03:30)"
$SSH "$HOST" "mkdir -p ~/backups && chmod +x $DIR/deploy/backup.sh && (crontab -l 2>/dev/null | grep -v ministudio/deploy/backup.sh; echo '30 3 * * * \$HOME/ministudio/deploy/backup.sh >> \$HOME/backups/cron.log 2>&1') | crontab -"

echo "==> Health"
$SSH "$HOST" 'for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/login || true); [ "$code" = 200 ] && { echo "app up (login 200)"; exit 0; }; sleep 2; done; echo "app did not come up"; sudo docker compose -f ministudio/docker-compose.yml logs --tail 50 app; exit 1'
