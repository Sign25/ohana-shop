import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DEFAULT_REQUISITES, invoiceHtml, Requisites } from "../../../../../../lib/invoice"

/** GET /admin/ohana/orders/:id/invoice — печатная форма счёта (HTML, открывается из карточки заказа) */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "created_at", "email", "status", "total", "shipping_total", "metadata", "items.title", "items.product_title", "items.variant_title", "items.quantity", "items.unit_price", "items.total", "items.variant.sku", "shipping_address.*", "shipping_methods.name"],
    filters: { id: req.params.id },
  })
  const order = data[0]
  if (!order) return res.status(404).send("Заказ не найден")
  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  // реквизиты продавца: Настройки → Магазин → Метаданные — либо отдельные ключи (bank, bik, rs, ks, director, accountant…),
  // либо один ключ requisites с JSON; пустые значения не перекрывают значения по умолчанию
  const meta = (stores[0]?.metadata || {}) as Record<string, any>
  let extra: Partial<Requisites> = {}
  try { const raw = meta.requisites; extra = typeof raw === "string" ? JSON.parse(raw) : raw || {} } catch {}
  for (const k of Object.keys(DEFAULT_REQUISITES) as (keyof Requisites)[]) if (meta[k]) extra[k] = String(meta[k])
  const requisites = { ...DEFAULT_REQUISITES, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) } as Requisites
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.send(invoiceHtml(order, requisites))
}
