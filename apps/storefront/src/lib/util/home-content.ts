/** Статика главной, перенесённая со старого сайта (картинки лежат в /srv/ohana/shared/images/ohana) */
export const IMG = "https://api.ohanaopt.ru/images/ohana"

export const USP = [
  { title: "Собственное контрактное производство", text: "отшиваем по своим лекалам, отгружаем по всей России", img: `${IMG}/usp/production.webp` },
  { title: "Первая доставка — за наш счёт", text: "до терминала ТК в Омске — бесплатно всегда", img: `${IMG}/usp/delivery.webp` },
  { title: "Скидки от объёма", text: "крупный опт от 100 000 ₽ — автоматически", img: `${IMG}/usp/volume.webp` },
  { title: "4,8 — рейтинг покупателей", text: "более 2 млн оценок на Wildberries", img: `${IMG}/usp/rating.webp` },
]

/** Плитки подразделов в секциях главной (как блок «Категории — плашки» на старом сайте): подраздел ищем по названию внутри раздела */
export const SECTION_TILES: Record<string, { title: string; img: string; match: RegExp }[]> = {
  "zhenskaya-odezhda": [
    { title: "Футболки с принтом", img: `${IMG}/tiles/woman_futbolki_print.jpg`, match: /^футболки/i },
    { title: "Халаты", img: `${IMG}/tiles/woman_halaty.jpg`, match: /^халаты/i },
  ],
  "muzhskaya-odezhda": [
    { title: "Футболки с принтом", img: `${IMG}/tiles/men_futbolki_print.jpg`, match: /^футболки/i },
    { title: "Джоггеры", img: `${IMG}/tiles/men_dzhoggery.jpg`, match: /^брюки/i },
  ],
  "odezhda-dlya-devochek": [
    { title: "Футболки с принтом", img: `${IMG}/tiles/girl_futbolki_print.jpg`, match: /^футболки/i },
    { title: "Джоггеры", img: `${IMG}/tiles/girl_dzhoggery.jpg`, match: /^брюки/i },
  ],
  "odezhda-dlya-malchikov": [
    { title: "Футболки с принтом", img: `${IMG}/tiles/boy_futbolki_print.jpg`, match: /^футболки/i },
    { title: "Джоггеры", img: `${IMG}/tiles/boy_dzhoggery.jpg`, match: /^брюки/i },
  ],
  "domashniy-tekstil": [
    { title: "Полотенца микс", img: `${IMG}/tiles/tex_polotenca_mix.jpg`, match: /^полотенц/i },
    { title: "Полотенце махровое", img: `${IMG}/tiles/tex_polotence_mahrovoe.jpg`, match: /^полотенц/i },
  ],
}

export const STEPS = [
  { n: 1, title: "Зарегистрируйтесь", text: "2 минуты — и вам доступны оптовые цены и личный кабинет", img: `${IMG}/usp/step_reg.webp` },
  { n: 2, title: "Скачайте прайс", text: "актуальный Excel с ценами, остатками и кратностью упаковок", img: `${IMG}/usp/step_price.webp` },
  { n: 3, title: "Соберите заказ", text: "линейками через быстрый заказ — от 100 000 ₽ включается крупный опт", img: `${IMG}/usp/step_order.webp` },
]

export const PARTNERS = Array.from({ length: 10 }, (_, i) => `${IMG}/partners/partner_${i + 1}.png`)

export const SOCIALS = [
  { key: "vk", name: "ВКонтакте", href: "https://vk.com/ohana_market", color: "#0077FF" },
  { key: "ok", name: "Одноклассники", href: "https://ok.ru/ohanamarket55", color: "#EE8208" },
]

export const CONTACTS = {
  phone: "8 (991) 430-17-30", phoneHref: "tel:+79914301730", hours: "пн–пт 10:00–18:00 (МСК+3)",
  email: "info@ohanamarket.ru", address: "644009, г. Омск, ул. 26-я Линия, д. 85А",
  mapHref: "https://yandex.ru/maps/?text=" + encodeURIComponent("Омск, ул. 26-я Линия, 85А"),
  company: "ООО «Охана Маркет»",
}
