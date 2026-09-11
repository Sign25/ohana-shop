import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** GET ?product_id= — сколько ждут; POST {product_id, email} — записать заявку */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const pid = String((req.query as any).product_id || ""); if (!pid) return res.json({ count: 0 })
  const rows = await svc.listDemands({ product_id: pid }, { select: ["email"] })
  res.json({ count: new Set(rows.map((r: any) => r.email.toLowerCase())).size })
}
export const POST = async (req: MedusaRequest<any>, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const b = (req.body || {}) as any
  const pid = String(b.product_id || ""), email = String(b.email || "").trim().toLowerCase()
  if (!pid) return res.status(400).json({ message: "Товар не найден." })
  if (!EMAIL.test(email)) return res.status(400).json({ message: "Укажите электронную почту, чтобы мы сообщили о поступлении.", need_email: true })
  const [exists] = await svc.listDemands({ product_id: pid, email })
  if (!exists) await svc.createDemands([{ product_id: pid, email, customer_id: (req as any).auth_context?.actor_id || null, ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").slice(0, 45) }])
  const rows = await svc.listDemands({ product_id: pid }, { select: ["email"] })
  res.json({ ok: true, count: new Set(rows.map((r: any) => r.email)).size, message: `Записали. Сообщим на ${email}, как только товар вернётся.` })
}
