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

## Новые товары и фото из 1С (CommerceML, ночной конвейер)
Пока 1С выгружает каталог на старый сайт, новый берёт его копию оттуда. Цепочка `/srv/ohana/bin/cml-nightly.sh` (cron 04:20, лог `/srv/ohana/logs/cml-nightly.log`):
1. `rsync root@83.217.223.209:/ /srv/ohana/shared/cml/` — ключ ohana ограничен на старом сервере `rrsync -ro /root/cml_keep` (путь в команде — `:/`, корень = /root/cml_keep). Там сторож `/usr/local/sbin/cml_keep.sh` (cron */5) копирует `import*.xml`, `offers*.xml`, `import_files/` после каждого обмена.
2. `src/scripts/resize-cml.mjs` — веб-копии новых фото в `/srv/ohana/shared/images/web/cml/…` (пропускает уже сделанные; у файлов из 1С mtime бывает в будущем).
3. `src/scripts/import-commerceml.ts [dry] [file=…] [limit=N]` — новые товары (номенклатура из групп «Сайт ОПТ+РОЗН»/«Номенклатура 2026»), новые размеры у существующих, новые фото, описания, характеристики, категории по GUID группы. Ключ сопоставления — `metadata.guid`.
   - Из `offers*.xml` берутся остаток и реквизиты характеристики (Цвет/Размер). Характеристики без реквизитов при наличии оформленных — старые дубли (типовой обмен 1С их тоже отбрасывал), пропускаются; одинаковые размер+цвет — остаётся вариант с остатком. Новый размер у существующего товара добавляется только при остатке > 0.
   - Размер берётся из реквизита характеристики, иначе из хвоста имени «(Цвет …, размер …)», «(58)», «(44-50)», «(L)».
4. `sync-1c-prices.ts` и `sync-1c-stock.ts` — цены и остатки для новых вариантов.
Проверка перед реальным прогоном: `sudo -u ohana -H npx medusa exec ./src/scripts/import-commerceml.ts dry`.
При переключении 1С на новый сайт шаг 1 заменяется приёмом CommerceML напрямую (маршрут ещё не написан).

## Фото: только JPEG в веб-копиях
PNG-копии весили 1–3 МБ (4,4 ГБ на 3146 файлов) и тормозили каталог, поэтому все веб-копии — JPEG q82 на белом фоне (`resize-images.mjs`, `resize-cml.mjs`, разовый `convert-png.mjs`; ссылки в `image.url`/`product.thumbnail` переключены с `.png` на `.jpg` 10.09.2026). Оригиналы PNG остаются в `detailed/` и `cml/import_files`. `trim-padding.mjs <handle категории> [dry]` обрезает белые/прозрачные поля у фото раздела (нужно было сокам).

## Яндекс.Метрика
Счётчик подключается только при `NEXT_PUBLIC_METRIKA_ID` в `apps/storefront/.env` (при запуске вписать счётчик опта 102279069 и пересобрать витрину). Пока пусто — тестовый трафик в статистику не попадает. Ecommerce через dataLayer: detail (карточка), add/remove (корзина), purchase (страница «заказ оформлен», без дублей); цели `sizefinder_used`, `bizcalc_add_to_cart` — создать в счётчике после включения. Код: `src/lib/util/metrika.ts`, `src/modules/analytics/*`.

## WebMCP (инструменты для браузерных агентов)
`src/modules/webmcp/index.tsx` регистрирует в `document.modelContext` (или `navigator.modelContext`) инструменты: `get_wholesale_terms`, `search_products`, `get_cart`, `add_to_cart` (только с `confirm: true`, показывает уведомление), `open_page`. Оформление заказа агенту не отдаётся. Для ручной проверки те же функции — `window.__ohanaTools` в консоли.

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
