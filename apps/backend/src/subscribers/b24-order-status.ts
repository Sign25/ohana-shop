import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { b24Enabled, commentDeal } from "../lib/b24"

const TEXT: Record<string, string> = {
  "order.canceled": "Заказ отменён", "order.completed": "Заказ выполнен", "shipment.created": "Заказ отгружен", "payment.captured": "Оплата получена",
}

/** Изменения по заказу → комментарий в сделку Б24 (как sync_status на старом сайте) */
export default async function b24OrderStatus({ event, container }: SubscriberArgs<any>) {
  if (!b24Enabled() || process.env.B24_SYNC_STATUS === "N") return
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  let orderId: string | undefined = event.data?.order_id || (event.name.startsWith("order.") ? event.data?.id : undefined)
  if (!orderId && event.name === "shipment.created" && event.data?.id) {
    const { data } = await query.graph({ entity: "fulfillment", fields: ["id", "order.id"], filters: { id: event.data.id } })
    orderId = (data[0] as any)?.order?.id
  }
  if (!orderId && event.name === "payment.captured" && event.data?.id) {
    const { data } = await query.graph({ entity: "payment", fields: ["id", "payment_collection.order.id"], filters: { id: event.data.id } })
    orderId = (data[0] as any)?.payment_collection?.order?.id
  }
  if (!orderId) return
  const { data } = await query.graph({ entity: "order", fields: ["id", "display_id", "metadata"], filters: { id: orderId } })
  const o = data[0]; const dealId = Number(o?.metadata?.b24_deal_id) || 0
  if (!dealId) return
  await commentDeal(dealId, `${TEXT[event.name] || event.name} (заказ #${o.display_id})`)
}
export const config: SubscriberConfig = { event: ["order.canceled", "order.completed", "shipment.created", "payment.captured"] }
