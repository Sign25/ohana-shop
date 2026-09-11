/**
 * Печатная форма «Счёт на оплату» по заказу. Реквизиты продавца — из store.metadata.requisites
 * (Настройки → Магазин → Метаданные, ключ requisites с JSON), недостающее берётся из значений по умолчанию.
 */
export type Requisites = {
  name: string; inn: string; kpp: string; ogrn: string; address: string; phone: string; email: string
  bank: string; bik: string; rs: string; ks: string; director: string; accountant: string
}
export const DEFAULT_REQUISITES: Requisites = {
  name: "Общество с ограниченной ответственностью «Охана Маркет»", inn: "5501191676", kpp: "550301001", ogrn: "1185543026822",
  address: "644009, Омская область, г. Омск, ул. 26-я Линия, д. 85А", phone: "8 (991) 430-17-30", email: "info@ohanamarket.ru",
  bank: "", bik: "", rs: "", ks: "", director: "", accountant: "",
}
const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const rub = (n: any) => (Number(n) || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateRu = (d: any) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" })

/** Сумма прописью (рубли/копейки) */
export function amountInWords(total: number): string {
  const ones = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"], onesF = ["", "одна", "две"]
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"]
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"]
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"]
  const forms = (n: number, f: [string, string, string]) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? f[0] : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? f[1] : f[2] }
  const tri = (n: number, fem: boolean) => { const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10; let s = hundreds[h]; if (t === 1) s += " " + teens[o]; else { s += " " + tens[t]; s += " " + (fem && o < 3 ? onesF[o] : ones[o]) } return s.replace(/\s+/g, " ").trim() }
  const rubles = Math.floor(total), kop = Math.round((total - rubles) * 100)
  if (rubles === 0) return `Ноль рублей ${String(kop).padStart(2, "0")} копеек`
  const groups: [number, [string, string, string], boolean][] = [[1e9, ["миллиард", "миллиарда", "миллиардов"], false], [1e6, ["миллион", "миллиона", "миллионов"], false], [1e3, ["тысяча", "тысячи", "тысяч"], true]]
  let rest = rubles, out: string[] = []
  for (const [div, f, fem] of groups) { const n = Math.floor(rest / div); if (n) { out.push(tri(n, fem) + " " + forms(n, f)); rest %= div } }
  if (rest) out.push(tri(rest, false))
  const words = out.join(" ")
  const res = `${words} ${forms(rubles, ["рубль", "рубля", "рублей"])} ${String(kop).padStart(2, "0")} ${forms(kop, ["копейка", "копейки", "копеек"])}`
  return res.charAt(0).toUpperCase() + res.slice(1)
}

export function invoiceHtml(order: any, req: Requisites, logoUrl?: string): string {
  const m = order.metadata || {}, a = order.shipping_address || {}
  const buyer = m.invoice_recipient || a.company || `${a.first_name || ""} ${a.last_name || ""}`.trim() || order.email
  const buyerLine = [buyer, m.cost_center && `ИНН ${m.cost_center}`, m.kpp && `КПП ${m.kpp}`, m.legal_address].filter(Boolean).join(", ")
  const items = (order.items || []).map((it: any, i: number) => `<tr><td class="c">${i + 1}</td><td>${esc(it.product_title || it.title)}${it.variant_title ? `, ${esc(it.variant_title)}` : ""}${it.variant?.sku ? ` <span class="mut">арт. ${esc(String(it.variant.sku).split("-")[0])}</span>` : ""}</td><td class="c">${it.quantity}</td><td class="c">шт</td><td class="r">${rub(it.unit_price)}</td><td class="r">${rub(it.total ?? it.unit_price * it.quantity)}</td></tr>`).join("")
  const shipping = Number(order.shipping_total) > 0 ? `<tr><td class="c">${(order.items || []).length + 1}</td><td>Доставка</td><td class="c">1</td><td class="c">усл.</td><td class="r">${rub(order.shipping_total)}</td><td class="r">${rub(order.shipping_total)}</td></tr>` : ""
  const total = Number(order.total) || 0, qty = (order.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0)
  const missing = !req.rs || !req.bik
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Счёт № ${esc(order.display_id)} от ${dateRu(order.created_at)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;margin:0;padding:24px;max-width:800px}
table{border-collapse:collapse;width:100%}
.bank td{border:1px solid #000;padding:4px 6px;vertical-align:top}
h1{font-size:18px;margin:18px 0 4px}
.line{border-bottom:2px solid #000;margin:6px 0 12px}
.items th,.items td{border:1px solid #000;padding:4px 6px}
.items th{background:#f2f2f2;font-weight:bold}
.c{text-align:center}.r{text-align:right;white-space:nowrap}.mut{color:#666;font-size:11px}
.tot td{border:0;padding:2px 6px;text-align:right}
.sign{margin-top:28px;display:flex;gap:60px}.sign div{flex:1}.sign .l{border-bottom:1px solid #000;height:30px}
.warn{background:#fff3cd;border:1px solid #e0b300;padding:8px 10px;margin-bottom:12px}
.note{color:#444;font-size:11px;margin-top:14px}
@media print{.noprint{display:none}body{padding:0}}
</style></head><body>
<div class="noprint" style="margin-bottom:12px"><button onclick="window.print()">Печать / сохранить в PDF</button></div>
${missing ? `<div class="warn noprint">Не заполнены банковские реквизиты продавца. Заполните в админке: Настройки → Магазин → Метаданные, ключи <b>bank</b>, <b>bik</b>, <b>rs</b> (расчётный счёт), <b>ks</b> (корр. счёт), <b>director</b>, <b>accountant</b>.</div>` : ""}
<table class="bank"><tr><td colspan="2" style="width:50%">${esc(req.bank || "Банк получателя")}</td><td style="width:12%">БИК</td><td>${esc(req.bik)}</td></tr>
<tr><td colspan="2"></td><td>Сч. №</td><td>${esc(req.ks)}</td></tr>
<tr><td>ИНН ${esc(req.inn)}</td><td>КПП ${esc(req.kpp)}</td><td rowspan="2">Сч. №</td><td rowspan="2">${esc(req.rs)}</td></tr>
<tr><td colspan="2">${esc(req.name)}<br><span class="mut">Получатель</span></td></tr></table>
<h1>Счёт на оплату № ${esc(order.display_id)} от ${dateRu(order.created_at)}</h1><div class="line"></div>
<table><tr><td style="width:90px;vertical-align:top">Поставщик<br>(Исполнитель):</td><td><b>${esc(req.name)}, ИНН ${esc(req.inn)}, КПП ${esc(req.kpp)}, ${esc(req.address)}, тел.: ${esc(req.phone)}</b></td></tr>
<tr><td style="vertical-align:top">Покупатель<br>(Заказчик):</td><td><b>${esc(buyerLine)}</b>${order.email ? `<br><span class="mut">${esc(order.email)}${m.contact_phone ? ", " + esc(m.contact_phone) : ""}</span>` : ""}</td></tr>
<tr><td>Основание:</td><td>Заказ № ${esc(order.display_id)} на сайте ohanaopt.ru${m.requisition_number ? `, заявка покупателя ${esc(m.requisition_number)}` : ""}</td></tr></table>
<table class="items" style="margin-top:12px"><thead><tr><th style="width:28px">№</th><th>Товары (работы, услуги)</th><th style="width:50px">Кол-во</th><th style="width:40px">Ед.</th><th style="width:90px">Цена</th><th style="width:100px">Сумма</th></tr></thead>
<tbody>${items}${shipping}</tbody></table>
<table class="tot" style="margin-top:6px"><tr><td>Итого:</td><td style="width:110px"><b>${rub(total)}</b></td></tr><tr><td>Без налога (НДС)</td><td>—</td></tr><tr><td>Всего к оплате:</td><td><b>${rub(total)}</b></td></tr></table>
<p>Всего наименований ${(order.items || []).length}, на сумму ${rub(total)} руб.<br><b>${esc(amountInWords(total))}</b></p>
<div class="line"></div>
<div class="sign"><div>Руководитель<div class="l"></div><span class="mut">${esc(req.director)}</span></div><div>Бухгалтер<div class="l"></div><span class="mut">${esc(req.accountant)}</span></div></div>
<p class="note">Оплата данного счёта означает согласие с условиями поставки товара. Счёт действителен 3 банковских дня. Товар отгружается после поступления оплаты; ${qty} шт., доставка ${esc((order.shipping_methods || []).map((s: any) => s.name).join(", ") || "по договорённости")}.</p>
</body></html>`
}
