# Ohana Market — новый оптовый магазин: эксплуатация

Стек: Medusa 2.20 (бэкенд + админка) и Next.js (витрина), PostgreSQL 18, Redis 7, Caddy. Сервер 201.34.150.168 (Ubuntu 24.04), всё под пользователем `ohana`, код в `/srv/ohana/apps/shop` (этот репозиторий).

## Адреса
- Витрина: https://new.ohanaopt.ru (до запуска закрыта от индексации, `NEXT_PUBLIC_NOINDEX=1` в `apps/storefront/.env`).
- API и админка: https://api.ohanaopt.ru и https://api.ohanaopt.ru/app.
- Фото каталога: https://api.ohanaopt.ru/images/web/… (Caddy отдаёт `/srv/ohana/shared/images`, оригиналы в `detailed/`, веб-копии в `web/`).

## Службы
| Служба | Что | Порт | Рабочий каталог |
|---|---|---|---|
| `ohana-backend` | `medusa start` | 9000 | `apps/backend/.medusa/server` (после `medusa build`) |
| `ohana-storefront` | `next start` | 8000 | `apps/storefront` |
| `caddy` | TLS + прокси + статика | 80/443 | `/etc/caddy/Caddyfile` |

Секреты: `apps/backend/.env`, `apps/storefront/.env` (не в git), сводка реквизитов у root в `/root/ohana-shop-credentials.txt`, доступ к 1С — `/etc/ohana/1c_mcp.conf` (root:ohana 0640).

## Деплой изменений
```bash
cd /srv/ohana/apps/shop && sudo -u ohana -H git pull
# бэкенд (маршруты, скрипты, конфиг):
cd apps/backend && sudo -u ohana -H npx medusa build && systemctl restart ohana-backend
# витрина:
cd ../storefront && sudo -u ohana -H npx next build && systemctl restart ohana-storefront
```
Сборка витрины ≈ 1 мин, бэкенда ≈ 1 мин. Витрина при сборке ходит в API — бэкенд должен работать.

## Данные из 1С (`/etc/cron.d/ohana-shop`)
- `apps/backend/src/scripts/sync-1c-stock.ts` — остатки из регистра «Запасы и потребности» раз в час (25-я минута). Лог `/srv/ohana/logs/sync-1c-stock.log`.
- `apps/backend/src/scripts/sync-1c-prices.ts` — цены «Оптовая/Крупнооптовая/Акционная/Розничная цена САЙТ» из регистра «Цены номенклатуры 2.5», ночью 03:40. Лог `sync-1c-prices.log`.
- Запуск вручную: `cd apps/backend && sudo -u ohana -H npx medusa exec ./src/scripts/<скрипт>.ts [dry]`.
- Сопоставление с 1С — по GUID в `metadata.guid` товара (номенклатура) и варианта («номенклатура#характеристика»).
- Первичная миграция каталога из CS-Cart: `src/scripts/import-cscart.ts` (вход `/srv/ohana/shared/export_catalog.json`), пережатие фото — `src/scripts/resize-images.mjs`.

## Правила опта (бэкенд)
- `src/lib/ohana.ts` — пороги 35 000 ₽ (минимальный заказ) и 100 000 ₽ (крупный опт).
- `POST /store/carts/:id/ohana-tier` — пересчёт корзины на цены крупного опта (витрина зовёт после каждого изменения корзины, `lib/data/cart.ts → ohanaRetier`).
- `src/api/middlewares/ohana-min-order.ts` — отказ в оформлении ниже минимума.

## Витрина
- Токены бренда: `apps/storefront/tailwind.config.js` (цвета `oh-*`), `src/styles/globals.css` (шрифты, `.oh-btn`, `.oh-card`, `.oh-h`).
- Ключевые модули: `modules/layout` (шапка, топ-бар, меню «Каталог», мобильное меню, футер), `modules/products` (карточка, таблица размеров), `modules/store` (каталог, пагинация), `modules/cart`, `modules/checkout`, `modules/account`.
- Служебные страницы — `src/content/pages.json`, маршрут `/ru/p/<slug>`.
- Внутренние ссылки только через `LocalizedClientLink` (тег `<a href="/ru/…">` валит сборку).

## Проверка глазами
Скриншот страницы с cookie (витрина отвечает 307 без cookie):
```bash
python3 cdp_shot.py "https://new.ohanaopt.ru/ru" out.png '[{"name":"_medusa_cache_id","value":"x"}]' 1200 1440
```

## Бэкапы
- База: `sudo -u postgres pg_dump ohana_shop | gzip > /srv/ohana/backups/db-$(date +%F).sql.gz` (добавить в cron при запуске).
- Фото: `/srv/ohana/shared/images` (копия оригиналов есть на старом сервере).
