/** Витрины Ohana на маркетплейсах (как блок на старом сайте) и инструменты для бизнеса */
export const MARKETPLACES = [
  { key: "retail", name: "Розничный магазин", href: "https://ohana.market/", color: "#e8674f", note: "ohana.market — покупка поштучно" },
  { key: "ozon", name: "Ozon", href: "https://www.ozon.ru/seller/ooo-ohana-market-278176/products/", color: "#005BFF", note: "магазин ООО «Охана Маркет»" },
  { key: "ym", name: "Яндекс Маркет", href: "https://market.yandex.ru/store--okhana-market?businessId=74855982", color: "#FC3F1D", note: "витрина «Охана маркет»" },
  { key: "wb", name: "Wildberries", href: "https://www.wildberries.ru/seller/435177", color: "#CB11AB", note: "продавец 435177" },
]
export const BUSINESS_TOOLS = [
  { label: "Быстрый заказ", href: "/bystryy-zakaz", text: "Матрица размеров по артикулам — заказ за минуту" },
  { label: "Подбор размера", href: "/podbor-razmera", text: "Размер по меркам — взрослые и дети" },
  { label: "Бизнес с Оханой", href: "/biznes-s-ohanoy", text: "Считаем маржу и окупаемость закупки" },
  { label: "Совместные покупки", href: "/sovmestnye-pokupki", text: "Калькулятор для организаторов СП" },
]

/** Прайс-лист Excel собирается ночью на бэкенде и лежит в /uploads (домен API) */
export const PRICE_LIST_URL = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://api.ohanaopt.ru"}/uploads/price/ohana-price.xlsx`
