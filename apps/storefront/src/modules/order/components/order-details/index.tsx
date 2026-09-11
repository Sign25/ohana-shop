import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"

type OrderDetailsProps = { order: HttpTypes.StoreOrder }

const STATUS: Record<string, string> = { pending: "В работе", completed: "Выполнен", canceled: "Отменён", archived: "Архив", requires_action: "Нужно уточнение", draft: "Черновик" }
const PAY: Record<string, string> = { captured: "оплачен", authorized: "ждёт оплаты по счёту", awaiting: "ждёт оплаты по счёту", not_paid: "ждёт оплаты", refunded: "возврат", canceled: "отменён", partially_captured: "оплачен частично" }
const FUL: Record<string, string> = { not_fulfilled: "готовится к сборке", fulfilled: "собран", partially_fulfilled: "собран частично", shipped: "отгружен", partially_shipped: "отгружен частично", delivered: "доставлен", canceled: "отменён" }

const OrderDetails = ({ order }: OrderDetailsProps) => {
  const created = new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  const o = order as any
  return (
    <>
      <Heading level="h3" className="mb-2">Заказ</Heading>
      <div className="flex flex-col gap-1 text-sm text-ui-fg-subtle">
        <div className="flex justify-between"><Text>Номер заказа</Text><Text>#{order.display_id}</Text></div>
        <div className="flex justify-between"><Text>Дата заказа</Text><Text>{created}</Text></div>
        <div className="flex justify-between"><Text>Статус</Text><Text className="text-oh-ink">{STATUS[o.status] || o.status}</Text></div>
        {o.payment_status && <div className="flex justify-between"><Text>Оплата</Text><Text>{PAY[o.payment_status] || o.payment_status}</Text></div>}
        {o.fulfillment_status && <div className="flex justify-between"><Text>Отгрузка</Text><Text>{FUL[o.fulfillment_status] || o.fulfillment_status}</Text></div>}
        {o.metadata?.onec_number && <div className="flex justify-between"><Text>Номер в учёте</Text><Text>{o.metadata.onec_number}</Text></div>}
        <Text className="mt-2">Подтверждение и счёт отправим на <span className="font-semibold">{order.email}</span>.</Text>
        {o.customer_id && (
          <a href={`/ru/account/orders/details/${order.id}/invoice`} target="_blank" rel="noopener" className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-pill border border-oh-line-2 bg-white px-4 py-2 text-[13px] font-medium text-oh-ink hover:border-oh-azure hover:text-oh-azure">
            Скачать счёт на оплату
          </a>
        )}
      </div>
    </>
  )
}

export default OrderDetails
