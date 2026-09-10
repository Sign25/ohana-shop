#!/bin/bash
# Ночной конвейер каталога: копия CommerceML со старого сервера (rrsync -ro /root/cml_keep) →
# веб-копии новых фото → импорт новых товаров/размеров/фото → цены и остатки из 1С для новых вариантов.
# Запускается под пользователем ohana из /etc/cron.d/ohana-shop; с флагом --no-rsync — из маршрута /commerceml после приёма файлов от 1С. Лог: /srv/ohana/logs/cml-nightly.log
set -o pipefail
cd /srv/ohana/apps/shop/apps/backend || exit 1
log() { echo "$(date '+%F %T') $*"; }
if [ "$1" = "--no-rsync" ]; then
  log "без rsync (файлы приняты от 1С напрямую)"
else
  log "rsync"
  rsync -a --timeout=600 root@83.217.223.209:/ /srv/ohana/shared/cml/ || { log "rsync failed ($?)"; exit 1; }
fi
log "resize"
/usr/bin/node ./src/scripts/resize-cml.mjs 2>&1 | tail -2
log "import"
/usr/bin/npx medusa exec ./src/scripts/import-commerceml.ts 2>&1 | grep -E "новый товар|добавлены|итог|error|Error" 
log "prices"
/usr/bin/npx medusa exec ./src/scripts/sync-1c-prices.ts quiet 2>&1 | grep -iE "к обновлению|error"
log "stock"
/usr/bin/npx medusa exec ./src/scripts/sync-1c-stock.ts quiet 2>&1 | grep -iE "сопоставлено|error"
log "done"
