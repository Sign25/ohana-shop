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

## Приём обмена от 1С напрямую (`/commerceml`)
Маршрут `apps/backend/src/api/commerceml/route.ts` (логика в `src/lib/onec-exchange.ts`) говорит по протоколу «Обмен с сайтом» как CS-Cart: `type=catalog` — checkauth (Basic-auth) → init (`zip=no`, файлы до 50 МБ частями) → file (в `/srv/ohana/shared/cml/inbox/…`) → import (xml копируется в рабочий каталог; после `offers*.xml` картинки переносятся в `import_files/` и в фоне запускается `cml-nightly.sh --no-rsync`); `type=sale` — query отдаёт XML заказов без `metadata.onec_exported_at` (Ид товара = GUID «номенклатура#характеристика», реквизиты для счёта, комментарий), success помечает их выгруженными, file принимает статусы из 1С (`Номер по 1С`, `Статус заказа` → `order.metadata.onec_*`).
- Логин/пароль: `ONEC_EXCHANGE_LOGIN` / `ONEC_EXCHANGE_PASSWORD` в `apps/backend/.env` (копия в `/root/ohana-shop-credentials.txt`). Лог: `/srv/ohana/logs/commerceml.log` (МСК).
- Адрес для узла: сейчас `https://api.ohanaopt.ru/commerceml` или `https://new.ohanaopt.ru/commerceml` (Caddy проксирует `/commerceml*` на бэкенд и на домене витрины, чтобы после переезда домена адрес был `https://ohanaopt.ru/commerceml`, как у старого сайта).
- **Переключение при запуске:** в 1С в узлах 000000005 (опт) и 000000007 («Номенклатура 2026») поменять адрес, логин и пароль; включить регламентные задания (расписание «каждый день», см. память ohana-1c-exchange-nodes). Копирование с опта по rsync после этого можно убрать из cron (строка `20 4 * * *` — оставить `cml-nightly.sh --no-rsync` не нужно: конвейер запустится сам после приёма файлов).
- Проверка руками: `curl -u onec:… "https://api.ohanaopt.ru/commerceml?type=catalog&mode=checkauth"` → `success` + кука.

## Админка для менеджеров (api.ohanaopt.ru/app)
- **Язык:** у каждого сотрудника в профиле (Settings → Profile → Language) выбрать «Русский» — панель Medusa переведена. Наши разделы («Страницы», «Баннеры», «Компании», «Запросы цены», «Согласования») уже по-русски.
- **Заказы:** в карточке заказа справа блок «Оптовый заказ» — реквизиты для счёта (юрлицо, ИНН, КПП, юр. адрес), телефон, номер заявки, отметка на грузе, комментарий, уровень цен (опт / крупный опт), состояние обмена с 1С (номер и статус из 1С), кнопка **«Счёт на оплату»** (печатная форма `GET /admin/ohana/orders/:id/invoice`, печать/PDF из браузера). Оплату по счёту менеджер фиксирует кнопкой «Capture payment» в блоке Payments, отгрузку — «Create fulfillment». Банковские реквизиты продавца для счёта: Settings → Store → Metadata, ключи `bank`, `bik`, `rs`, `ks`, `director`, `accountant` (ИНН/КПП/ОГРН/адрес/телефон подставляются из реквизитов компании по умолчанию, их тоже можно переопределить ключами `inn`, `kpp`, `ogrn`, `address`, `phone`, `email`, `name`).
- **Страницы** (раздел «Страницы»): служебные страницы витрины `/p/<slug>`, HTML со своими стилями, предпросмотр, черновик/опубликована, порядок. Витрина читает их через `/store/ohana/pages` (кэш 60 с), запасной вариант — `src/content/pages.json` в репозитории (перенесён в базу скриптом `src/scripts/seed-content.ts`).
- **Баннеры** (раздел «Баннеры»): карусель главной (место `hero`), картинка загружается прямо в форме (файлы в `/srv/ohana/shared/uploads`, отдаются как `https://api.ohanaopt.ru/uploads/…`), ссылка — внутренний адрес сайта, порядок, вкл/выкл, сроки показа. Если ни одного включённого баннера нет — витрина показывает креативы по умолчанию из `public/hero`.
- **Подборки и чипы** («Осень/зима 2027», «Big size»): это категории с `metadata.kind = showcase` — состав меняется в Products → Categories (добавить товары в категорию), скрытые подборки перечислены в `lib/util/ohana.ts` (`HIDDEN_SHOWCASES`).
- **Товары:** карточки редактируются штатно (описание, фото, категории). Ночной импорт из 1С обновляет описание только если оно длиннее, фото добавляет, категории добавляет; цены и остатки приходят из 1С и правятся там, а не в админке.
- Ловушка сборки админки: в workspace две копии React (18 у панели, 19 у витрины) — в `medusa-config.ts` задан `admin.vite.resolve.dedupe`, без него все страницы падают с React error #31.

## Инструменты менеджера заказов (перенос со старого сайта)
- **«Заказы опта»** (раздел в меню): список с покупателем/ИНН, суммой, уровнем цен, оплатой, отгрузкой и номером/статусом 1С; фильтры «Новые / Не оплачены / Не отгружены / Не в 1С», поиск; из строки — счёт и лист подбора.
- **Карточка заказа:** справа «Оптовый заказ» (реквизиты, комментарий, 1С, кнопки «Счёт на оплату», «Лист подбора», ссылка на сделку Б24), внизу «Состав для сборки» (артикул, цвет, размер · рост, ОГ-ОТ-ОБ, количество, комплекты).
- **Лист подбора** `GET /admin/ohana/orders/:id/packing-slip` — тот же макет, что документ packing_slip на CS-Cart (`src/lib/packing.ts`): фото, чекбоксы, сортировка по артикулу, комплекты «N компл. ×K шт», итог, подписи Собрал/Проверил/Дата. Размер/рост/ОГ-ОТ-ОБ разбираются из `variant.metadata.size` («56 170 (112-92-120)»).
- **Отслеживание:** отгрузка через штатные «Create fulfillment» (склад «Оптовый склад Омск», демо-склад удалён) → «Mark as shipped» с номером накладной ТК. Покупатель видит статус, дату отгрузки и номер накладной со ссылкой на трекинг ТК (ПЭК, Деловые линии, СДЭК, Почта, Энергия, Байкал — по названию способа доставки) в кабинете и на странице заказа. Журнал изменений заказа — штатная «Activity».
- **Битрикс24** (`src/lib/b24.ts`, `src/subscribers/b24-*.ts`): новый заказ → сделка (контакт по телефону/почте, иначе создаётся), id в `order.metadata.b24_deal_id`; отмена/выполнение/отгрузка/оплата → комментарий в сделку. Вебхук `B24_WEBHOOK_URL` в `apps/backend/.env` (скопирован с опта; пусто = выключено), лог `/srv/ohana/logs/b24.log`.
- Не переносилось: журнал округления копеек (ohana_rounding — цены из 1С уже целые), pdf_documents (печать из браузера), Excel-прайс для покупателей (отдельная задача).

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

## Карточка товара, каталог и инструменты покупателя (перенос механик старого сайта, 11.09.2026)

- **Три механики продажи** (`lib/util/ohana.ts: saleMode`): поштучно кратно упаковке (каталог ОПТ+РОЗН), комплектом — полной размерной линейкой («Номенклатура 2026», `product.metadata.lineika/set_qty`, один вариант «Комплект»), упаковками (продукты, `variant.metadata.pack_unit` 'S' — цена за штуку / 'Y' — цена за упаковку). Разметка: `scripts/mark-lineika.ts`; импорт CommerceML создаёт комплекты одним вариантом.
- **«Ваш расчёт»** на карточке (`product-variants-table`): цена на уровне опт / крупный опт / акция с учётом суммы корзины (`retrieveCartSummary`), экономия, вес, итог, прогресс до 35 000 / 100 000 ₽. Добавление в корзину — только через `addToCartEventBus` (CartProvider в шапке сам шлёт bulk; прямой вызов `addToCartBulk` дублирует позиции).
- **Акция**: прайс-лист «Акция» типа sale применяется Medusa сама → `calculated_amount` = акция, `original_amount` = опт (`variantOpt`/`variantSale`). Акция показывается только если ниже опта.
- **Бейджи** (`product-badges`): Акция, Новинка (после 12.09.2026, 21 день), Big size, Осень/зима, Комплект/Упаковка, «Хит продаж» (≥1000 отзывов WB).
- **«Другие расцветки»**: регистр 1С БИТ_АльтернативыНоменклатуры → `scripts/sync-1c-alternatives.ts` → `product.metadata.alt_group` → `/store/ohana/alternatives` → карусель под галереей.
- **«Мне это нужно»** для распроданных: модель `Demand` (модуль content, таблица `ohana_demand`), `POST /store/ohana/demand`, виджет в админке товара «Ждут поступления» (`/admin/ohana/demand`).
- **Таблица размеров** — вкладка (взрослые / брюки / дети) + ссылка на подбор.
- **Каталог** (`/store/ohana/catalog`): по умолчанию только в наличии (`stock=all` — все), теги `sale=1`, `new=1`, сортировка `order=hits` (по отзывам WB), товары без фото скрыты. Чипы на главной: Новинки / Акции / Хиты продаж.
- **Общие промо-картинки** («Лауреат премий», схемы размеров): `scripts/fix-shared-images.ts` (md5 у ≥10 товаров → в конец галереи; без своего фото → thumbnail снят, список `/srv/ohana/logs/no-photo.tsv`, 57 товаров). **Архив 1С**: `scripts/unpublish-1c-archive.ts` (папка «архив» + двойник артикула → draft). Оба — в ночном конвейере.
- **Отзывы Wildberries**: таблицы `ohana_wb_rating` / `ohana_wb_review` (модуль content), перенос со старого сайта `scripts/import-wb-tsv.ts`, синк `scripts/sync-wb-reviews.ts` (токен `/etc/ohana/wb.conf`, cron вс 05:30), `/store/ohana/wb`; на витрине звёзды в плитке, рейтинг под названием, вкладка «Отзывы».
- **Быстрый заказ** `/bystryy-zakaz` (матрица размеров по моделям, `bizcalc-search` + `addToCartBulk`). **Прайс Excel с фото**: `scripts/build-price-xlsx.ts` → `/srv/ohana/shared/uploads/price/ohana-price.xlsx` (ночью; ссылка `PRICE_LIST_URL` в футере/кабинете/быстром заказе; exceljs ставить из корня воркспейса: `pnpm add exceljs --filter ./apps/backend` — в apps/backend лежит `.npmrc node-linker=hoisted`, установка оттуда ломает раскладку и дублирует core-flows).
- **Заказать звонок** (топ-бар): `POST /store/ohana/callback` → лид Битрикс24 (crm.lead.add) + `/srv/ohana/logs/callbacks.tsv`. **Подсказка при входе**: `POST /store/ohana/login-hint` (нет аккаунта / неверный пароль). **Счёт покупателю**: `/ru/account/orders/details/:id/invoice` → `/store/ohana/orders/:id/invoice` (только свой заказ). **Вес заказа** в корзине. Меню кабинета — блок «Инструменты». Цены из 1С округляются вверх до рубля.
- Ночной конвейер `/srv/ohana/bin/cml-nightly.sh`: rsync → resize → import → prices → stock → shared images → archive → alternatives → price xlsx.
