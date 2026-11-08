#!/bin/sh
# Daily MongoDB dump on the server (run by cron, see deploy/deploy.sh). Keeps the last 14 archives.
#   sh backup.sh            # writes ~/backups/ministudio-YYYYmmdd-HHMM.archive.gz
set -eu
DIR="$HOME/backups"
mkdir -p "$DIR"
OUT="$DIR/ministudio-$(date +%Y%m%d-%H%M).archive.gz"
sudo docker compose -f "$HOME/ministudio/docker-compose.yml" exec -T mongo mongodump --archive --gzip --db "${MONGODB_DB:-ministudio}" > "$OUT"
[ -s "$OUT" ] || { echo "empty backup"; rm -f "$OUT"; exit 1; }
ls -1t "$DIR"/ministudio-*.archive.gz | tail -n +15 | xargs -r rm -f
echo "backup ok: $OUT"
