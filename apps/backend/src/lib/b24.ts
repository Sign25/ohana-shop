/**
 * Битрикс24: заказ → сделка (контакт ищем по телефону/почте, иначе создаём), смена статуса → комментарий в сделку.
 * Перенос аддона ohana_b24 со старого сайта. Вебхук — B24_WEBHOOK_URL в apps/backend/.env; пусто = выключено.
 * Всё неблокирующее: ошибки только в лог, оформление заказа не зависит от Б24.
 */
import * as fs from "fs"

const LOG = "/srv/ohana/logs/b24.log"
export const b24Enabled = () => !!process.env.B24_WEBHOOK_URL
const log = (msg: string) => { try { fs.appendFileSync(LOG, `${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Moscow" })} ${msg}\n`) } catch {} }

const form = (params: any, prefix = ""): string[] => Object.entries(params).flatMap(([k, v]) => {
  const key = prefix ? `${prefix}[${k}]` : k
  if (v && typeof v === "object") return form(v, key)
  return v === undefined || v === null ? [] : [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`]
})

export async function b24Call(method: string, params: Record<string, any> = {}): Promise<any> {
  const base = (process.env.B24_WEBHOOK_URL || "").replace(/\/+$/, "")
  if (!base) return null
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000)
    const r = await fetch(`${base}/${method}.json`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form(params).join("&"), signal: ctl.signal })
    clearTimeout(t)
    const data: any = await r.json().catch(() => ({}))
    if (data.error) { log(`API ERR ${method}: ${data.error} — ${data.error_description || ""}`); return null }
    if (!r.ok) { log(`HTTP ${r.status} ${method}`); return null }
    return data.result ?? null
  } catch (e: any) { log(`FAIL ${method}: ${e?.message || e}`); return null }
}

const rub = (n: any) => `${Math.round(Number(n) || 0).toLocaleString("ru-RU")} ₽`

export async function findOrCreateContact(o: any): Promise<number> {
  const a = o.shipping_address || {}, m = o.metadata || {}
  const phone = String(m.contact_phone || a.phone || "").replace(/[^\d+]/g, ""), email = String(o.email || "").trim()
  for (const [type, value] of [["PHONE", phone], ["EMAIL", email]] as const) {
    if (!value) continue
    const dup = await b24Call("crm.duplicate.findbycomm", { entity_type: "CONTACT", type, values: [value] })
    if (dup?.CONTACT?.[0]) return Number(dup.CONTACT[0])
  }
  const fields: any = { NAME: a.first_name || "", LAST_NAME: a.last_name || "", OPENED: "Y", TYPE_ID: "CLIENT", SOURCE_ID: "WEB" }
  if (m.invoice_recipient) fields.POST = m.invoice_recipient
  if (phone) fields.PHONE = [{ VALUE: phone, VALUE_TYPE: "WORK" }]
  if (email) fields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }]
  return Number(await b24Call("crm.contact.add", { fields })) || 0
}

export function orderBody(o: any): string {
  const m = o.metadata || {}
  const lines = (o.items || []).map((it: any) => `• ${it.product_title || it.title}${it.variant_title ? `, ${it.variant_title}` : ""} — ${it.quantity} шт × ${rub(it.unit_price)}`)
  lines.push(`Итого: ${rub(o.total)}`)
  if (m.invoice_recipient) lines.push(`Плательщик: ${m.invoice_recipient}${m.cost_center ? `, ИНН ${m.cost_center}` : ""}`)
  if ((o.shipping_methods || []).length) lines.push(`Доставка: ${o.shipping_methods.map((s: any) => s.name).join(", ")}`)
  if (m.notes) lines.push(`Комментарий: ${m.notes}`)
  lines.push(`Заказ в админке: ${process.env.MEDUSA_BACKEND_URL || "https://api.ohanaopt.ru"}/app/orders/${o.id}`)
  return lines.join("\n")
}

/** Новый заказ → сделка (или лид при B24_ENTITY=lead). Возвращает id сущности */
export async function pushOrder(o: any): Promise<{ entity: string; id: number } | null> {
  const title = `Заказ #${o.display_id} — ohanaopt.ru`, comments = orderBody(o)
  const a = o.shipping_address || {}, m = o.metadata || {}
  if ((process.env.B24_ENTITY || "deal") === "lead") {
    const fields: any = { TITLE: title, NAME: a.first_name || "", LAST_NAME: a.last_name || "", OPPORTUNITY: Number(o.total) || 0, CURRENCY_ID: "RUB", COMMENTS: comments, SOURCE_ID: "WEB", OPENED: "Y" }
    const phone = String(m.contact_phone || a.phone || "").replace(/[^\d+]/g, "")
    if (phone) fields.PHONE = [{ VALUE: phone, VALUE_TYPE: "WORK" }]
    if (o.email) fields.EMAIL = [{ VALUE: o.email, VALUE_TYPE: "WORK" }]
    const id = Number(await b24Call("crm.lead.add", { fields })) || 0
    if (id) log(`заказ #${o.display_id} → лид ${id}`)
    return id ? { entity: "lead", id } : null
  }
  const contactId = await findOrCreateContact(o)
  const fields: any = { TITLE: title, OPPORTUNITY: Number(o.total) || 0, CURRENCY_ID: "RUB", COMMENTS: comments, SOURCE_ID: "WEB", OPENED: "Y" }
  if (contactId) fields.CONTACT_ID = contactId
  const id = Number(await b24Call("crm.deal.add", { fields })) || 0
  if (id) log(`заказ #${o.display_id} → сделка ${id} (контакт ${contactId})`)
  return id ? { entity: "deal", id } : null
}

export async function commentDeal(dealId: number, text: string) {
  await b24Call("crm.timeline.comment.add", { fields: { ENTITY_ID: dealId, ENTITY_TYPE: "deal", COMMENT: text } })
}
