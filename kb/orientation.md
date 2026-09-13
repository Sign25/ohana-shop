# Новый оптовый магазин Ohana (Medusa 2 + Next.js) — ориентация

**Стенд:** витрина https://new.ohanaopt.ru, API и админка https://api.ohanaopt.ru/app, VPS 201.34.150.168 (Ubuntu 24.04, PostgreSQL 18, Redis 7, Node 24, Caddy). Код — https://github.com/Sign25/ohana-shop (pnpm-workspace: `apps/backend` Medusa 2.20, `apps/storefront` Next 15.5), рабочая копия `/srv/ohana/apps/shop`, пользователь `ohana`. **Главный документ — `OPS.md` в корне репозитория** (kb_get name=ops): адреса, службы, деплой, данные из 1С, ночной конвейер, админка менеджеров, карточка товара, каталог, правила показа, главная и подвал. Читать его целиком перед правками.

## Три магазина Ohana и их MCP
- **Опт (CS-Cart, боевой)** — https://ohanaopt.ru, VPS 83.217.223.209, MCP https://mcp.ohanaopt.ru/mcp, база знаний Sign25/ohanaopt kb/opt.
- **Розница (CS-Cart)** — https://109.196.102.171 (будущий ohana.market), MCP https://109-196-102-171.sslip.io/mcp, база знаний kb/rozn.
- **Новый опт (этот сервер)** — MCP https://api.ohanaopt.ru/mcp, база знаний — папка `kb/` репозитория Sign25/ohana-shop + OPS.md.
Токены всех MCP — в `/etc/ohana/mcp.conf` на каждом сервере (не печатать). Память агента-разработчика продублирована в Sign25/ohanaopt `docs/memory/`.

## Как деплоить
1. Правки в `/srv/ohana/apps/shop/apps/{backend,storefront}/src` (владелец файлов ohana).
2. Бэкенд: `cd apps/backend && npx medusa build && systemctl restart ohana-backend` (служба работает из `.medusa/server`). Новые модели модуля content → `npx medusa db:generate content && npx medusa db:migrate`.
3. Витрина: `cd apps/storefront && pnpm exec next build && systemctl restart ohana-storefront` (сборка требует живого бэкенда; при падении сборки старый `.next` удаляется — сайт лежит до успешной пересборки).
4. Коммит и пуш от ohana: `sudo -u ohana -H git add -A && git commit && git push` (deploy-ключ `/srv/ohana/.ssh/id_ed25519`).
5. Зависимости ставить только из корня воркспейса: `pnpm add X --filter ./apps/backend` (в apps/backend лежит `.npmrc node-linker=hoisted`, установка оттуда ломает раскладку и роняет бэкенд «Workflow … already exists»).

## Данные из 1С
CommerceML: файлы `/srv/ohana/shared/cml`, ночной конвейер `/srv/ohana/bin/cml-nightly.sh` 04:20 (rsync со старого опта → фото → импорт → цены → остатки → общие промо-картинки → архив 1С → ручные хиты → альтернативы → прайс Excel). Приём обмена напрямую — `/commerceml`. Остатки каждый час (:25) и блокировки 1С (:27) через MCP 1С (`/etc/ohana/1c_mcp.conf`). Два каталога: ОПТ+РОЗН (поштучно) и «Номенклатура 2026» (только комплектом — `product.metadata.lineika`). Отзывы Wildberries — по воскресеньям.

## Ловушки
- Добавление в корзину с карточки — только через `addToCartEventBus`; прямой `addToCartBulk` дублирует позиции.
- Прайс-лист «Акция» типа sale применяется Medusa сама: опт = `original_amount`.
- Compound-компоненты (`Accordion.Item`) нельзя использовать из серверных компонентов.
- Уникальные индексы моделей Medusa частичные (`where deleted_at is null`) — в `ON CONFLICT` указывать это условие.
- Цепочки деплоя с `set -e`: `curl -w` с кодом 000 роняет цепочку, сборка витрины не запускается.
- Список товаров без своего фото (скрыты из каталога): `/srv/ohana/logs/no-photo.tsv`.

## С чего начать
`kb_get name=ops` (OPS.md целиком), затем `platform_map`, `health`, `server_status`. Изменения — через `shell` (от пользователя ohana; для root-операций нужен sudo), после работы — `kb_write` заметки.
