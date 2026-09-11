import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { appendFileSync, mkdirSync } from "fs"
import { b24Call, b24Enabled } from "../../../../lib/b24"

const PHONE = /^[+\d][\d\s()\-]{7,}$/

/** POST /store/ohana/callback {name, phone, comment, page} — «Заказать звонок»: лид в Битрикс24, дубль в лог */
export const POST = async (req: MedusaRequest<any>, res: MedusaResponse) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const b = (req.body || {}) as any
  const name = String(b.name || "").trim().slice(0, 120), phone = String(b.phone || "").trim().slice(0, 40)
  const comment = String(b.comment || "").trim().slice(0, 1000), page = String(b.page || "").slice(0, 300)
  if (!PHONE.test(phone)) return res.status(400).json({ message: "Укажите номер телефона, по которому вам перезвонить." })
  const line = `${new Date().toISOString()}\t${name}\t${phone}\t${comment.replace(/\s+/g, " ")}\t${page}\n`
  try { mkdirSync("/srv/ohana/logs", { recursive: true }); appendFileSync("/srv/ohana/logs/callbacks.tsv", line) } catch {}
  let lead: number | null = null
  if (b24Enabled()) {
    try {
      lead = Number(await b24Call("crm.lead.add", { fields: { TITLE: `Заказать звонок: ${name || phone}`, NAME: name || undefined, PHONE: [{ VALUE: phone, VALUE_TYPE: "WORK" }], COMMENTS: `${comment}${page ? `\nСтраница: ${page}` : ""}`.trim(), SOURCE_ID: "WEB", SOURCE_DESCRIPTION: "ohanaopt.ru — заказать звонок" } })) || null
    } catch (e: any) { logger.warn(`Битрикс24: лид не создан (${e?.message || e})`) }
  }
  logger.info(`заказ звонка: ${phone} ${name}${lead ? ` → лид ${lead}` : ""}`)
  res.json({ ok: true, message: "Спасибо! Перезвоним в рабочее время: пн–пт 10:00–18:00 (Омск)." })
}
