import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { b24Enabled, pushOrder } from "../lib/b24"

/** Новый заказ → сделка в Битрикс24 (id сделки пишем в order.metadata.b24_deal_id) */
export default async function b24OrderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  if (!b24Enabled()) return
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "total", "metadata", "items.title", "items.product_title", "items.variant_title", "items.quantity", "items.unit_price", "shipping_address.*", "shipping_methods.name"],
    filters: { id: event.data.id },
  })
  const o = data[0]; if (!o || o.metadata?.b24_deal_id) return
  const ref = await pushOrder(o)
  if (ref) {
    const orderService = container.resolve(Modules.ORDER) as any
    await orderService.updateOrders([{ id: o.id, metadata: { ...(o.metadata || {}), [ref.entity === "deal" ? "b24_deal_id" : "b24_lead_id"]: ref.id } }])
  }
}
export const config: SubscriberConfig = { event: "order.placed" }
