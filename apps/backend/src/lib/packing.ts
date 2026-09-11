/**
 * Лист подбора (упаковочный лист) — перенос документа packing_slip со старого сайта:
 * фото, артикул, название, цвет, размер · рост, ОГ-ОТ-ОБ, количество (комплекты — «N компл. ×K шт»),
 * чекбоксы, итог «позиций · штук (в т.ч. комплектов)», подписи Собрал / Проверил / Дата. Цен нет.
 */
const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const plural = (n: number, f: [string, string, string]) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? f[0] : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? f[1] : f[2] }

export type PackItem = { num: number; image: string; code: string; name: string; color: string; size: string; rost: string; params: string; qty: number; is_set: boolean; sets: number; per_set: number; variant_title: string }

/** «56 170 (112-92-120)» → размер 56, рост 170, параметры 112-92-120; «122-128 (65-59-70)»; «54-58 регулируемый» */
export function parseSize(raw: string): { size: string; rost: string; params: string } {
  const s = String(raw || "").trim()
  const m = s.match(/^([\d]+(?:[-\/][\d]+)*|[A-Za-z]{1,4})(?:\s+(\d{2,3}))?(?:\s*\(([^)]*)\))?/)
  if (!m) return { size: s, rost: "", params: "" }
  return { size: m[1], rost: m[2] || "", params: (m[3] || "").replace(/\//g, "-") }
}

const natCmp = (a: string, b: string) => a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" })

export function packingItems(order: any): { items: PackItem[]; units: number; sets: number; summary: string } {
  let units = 0, setsTotal = 0
  const items: PackItem[] = (order.items || []).map((it: any) => {
    const vm = it.variant?.metadata || {}
    const qty = Number(it.quantity) || 0
    const perSet = Number(vm.pack_qty) || 0
    const isSet = vm.pack_unit === "Y" && perSet > 1 && qty > 0 && qty % perSet === 0
    const sets = isSet ? qty / perSet : 0
    units += qty; setsTotal += sets
    const p = parseSize(vm.size || it.variant_title || "")
    const name = String(it.product_title || it.title || "").replace(/\s*\((?:цвет|размер)[^)]*\)\s*$/i, "").trim()
    return {
      num: 0, image: it.thumbnail || it.variant?.product?.thumbnail || "", code: String(it.variant?.sku || "").split("-")[0] || String(it.product?.metadata?.code || ""),
      name, color: String(vm.color || ""), size: p.size, rost: p.rost, params: p.params, qty, is_set: isSet, sets, per_set: isSet ? perSet : 0, variant_title: String(it.variant_title || ""),
    }
  })
  items.sort((a, b) => natCmp(a.code, b.code) || natCmp(a.size, b.size) || natCmp(a.color, b.color))
  items.forEach((it, i) => (it.num = i + 1))
  const positions = items.length
  let summary = `${positions} ${plural(positions, ["позиция", "позиции", "позиций"])} · ${units} шт.`
  if (setsTotal > 0) summary += ` (в т.ч. ${setsTotal} ${plural(setsTotal, ["комплект", "комплекта", "комплектов"])})`
  return { items, units, sets: setsTotal, summary }
}

export function packingSlipHtml(order: any): string {
  const { items, summary } = packingItems(order)
  const m = order.metadata || {}, a = order.shipping_address || {}
  const client = [a.company || m.invoice_recipient, `${a.first_name || ""} ${a.last_name || ""}`.trim()].filter(Boolean).join(" · ")
  const date = new Date(order.created_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })
  const shipping = (order.shipping_methods || []).map((s: any) => s.name).join(", ")
  const notes = [m.notes, m.door_code && `Отметка на грузе: ${m.door_code}`].filter(Boolean).join(". ")
  const rows = items.map((it) => `<tr>
  <td><div class="ops-check"></div></td>
  <td style="text-align:center;font-size:12px">${it.num}</td>
  <td class="ops-photo">${it.image ? `<img src="${esc(it.image)}" alt="">` : `<span class="ops-nophoto"></span>`}</td>
  <td class="ops-code">${esc(it.code)}</td>
  <td>${esc(it.name)}${it.params ? `<div class="ops-muted">ОГ-ОТ-ОБ: ${esc(it.params)}</div>` : ""}</td>
  <td>${esc(it.color)}</td>
  <td style="white-space:nowrap">${esc(it.size)}${it.rost ? ` &middot; ${esc(it.rost)}` : ""}</td>
  <td class="ops-qty">${it.is_set ? `${it.sets} компл.<div class="ops-muted">&times;${it.per_set} шт = ${it.qty} шт</div>` : it.qty}</td>
  <td class="ops-unit">${it.is_set ? "компл" : "шт"}</td>
</tr>`).join("")
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Лист подбора · Заказ № ${esc(order.display_id)}</title>
<style>
body{margin:0;padding:18px;font-family:Arial,Helvetica,sans-serif;color:#000}
.ohana-ps{width:100%;max-width:190mm;margin:0 auto}
.ops-title{font-size:21px;font-weight:bold;letter-spacing:.3px;margin:0}
.ops-client{font-size:12.5px;margin-top:5px;line-height:1.45}
.ops-total{display:inline-block;margin-top:9px;border:2px solid #000;padding:6px 12px;font-size:16px;font-weight:bold}
table.ops-items{width:100%;border-collapse:collapse;margin-top:12px}
table.ops-items th{border:1px solid #000;border-bottom:2px solid #000;padding:4px 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;text-align:left;background:#e6e6e6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ops-items td{border:1px solid #999;padding:5px 6px;font-size:13px;vertical-align:middle}
table.ops-items tbody tr:nth-child(even) td{background:#f2f2f2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ops-items tbody tr:nth-child(5n) td{border-bottom:2.5px solid #000}
.ops-code{font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:bold;white-space:nowrap}
.ops-qty{font-size:18px;font-weight:bold;text-align:center;white-space:nowrap}
.ops-unit{text-align:center;font-size:12px;white-space:nowrap}
.ops-check{width:6mm;height:6mm;border:1.5px solid #000;margin:0 auto}
.ops-photo{text-align:center;padding:3px !important}
.ops-photo img{max-width:15mm;max-height:21mm;width:auto;height:auto;display:block;margin:0 auto}
.ops-photo .ops-nophoto{display:block;width:15mm;height:21mm;border:1px dashed #bbb;margin:0 auto}
.ops-muted{color:#444;font-size:11px;font-weight:normal}
.ops-sign{width:100%;margin-top:28px;font-size:13px;border-collapse:collapse}.ops-sign td{padding:4px 0}
.ops-notes{margin-top:12px;border:1px dashed #000;padding:6px 10px;font-size:12px}
@media print{.noprint{display:none}body{padding:0}.ohana-ps{max-width:none}}
</style></head><body><div class="ohana-ps">
<div class="noprint" style="margin-bottom:10px"><button onclick="window.print()">Печать / сохранить в PDF</button></div>
<p class="ops-title">ЛИСТ ПОДБОРА &middot; Заказ №${esc(order.display_id)} от ${date}</p>
<div class="ops-client">Клиент: <strong>${esc(client || order.email)}</strong>${a.phone || m.contact_phone ? ` &middot; ${esc(m.contact_phone || a.phone)}` : ""}${shipping ? ` &middot; Доставка: <strong>${esc(shipping)}</strong>` : ""} &middot; Оплата: счёт${order.payment_status === "captured" ? " (оплачен)" : ""}</div>
<div class="ops-total">Итого: ${esc(summary)}</div>
<table class="ops-items"><thead><tr>
<th style="width:9mm;text-align:center">&nbsp;</th><th style="width:8mm;text-align:center">№</th><th style="width:17mm;text-align:center">Фото</th><th style="width:23mm">Артикул</th><th>Название</th><th style="width:22mm">Цвет</th><th style="width:22mm">Размер &middot; Рост</th><th style="width:20mm;text-align:center">Кол-во</th><th style="width:12mm;text-align:center">Ед.</th>
</tr></thead><tbody>${rows}</tbody></table>
${notes ? `<div class="ops-notes"><strong>Комментарий к заказу:</strong> ${esc(notes)}</div>` : ""}
<table class="ops-sign"><tr><td style="width:34%">Собрал: ____________________</td><td style="width:36%">Проверил: ____________________</td><td style="width:30%">Дата: ____________________</td></tr></table>
</div></body></html>`
}
