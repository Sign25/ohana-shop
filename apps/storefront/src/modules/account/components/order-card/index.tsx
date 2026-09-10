import { formatRub, plural } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

const STATUS: Record<string, string> = {
  pending: "Ожидает оплаты",
  completed: "Выполнен",
  canceled: "Отменён",
  archived: "В архиве",
  requires_action: "Требует уточнения",
}
const PAY: Record<string, string> = {
  not_paid: "не оплачен",
  awaiting: "ожидает оплаты",
  captured: "оплачен",
  partially_captured: "оплачен частично",
  refunded: "возврат",
  canceled: "отменён",
}

const OrderCard = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const createdAt = new Date(order.created_at)
  const qty = order.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
  const positions = order.items?.length ?? 0

  return (
    <div className="oh-card flex flex-col gap-3 p-4 small:flex-row small:items-center small:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex">
          {order.items?.slice(0, 3).map((i) => (
            <div key={i.id} className="relative -ml-2 h-12 w-9 overflow-hidden rounded-md border-2 border-white bg-oh-paper first:ml-0">
              {i.thumbnail && <Image src={i.thumbnail} alt="" fill sizes="36px" className="object-cover" />}
            </div>
          ))}
        </div>
        <div>
          <div className="text-[14px] font-semibold text-oh-ink">
            Заказ №{order.display_id} <span className="font-normal text-oh-muted">от {createdAt.toLocaleDateString("ru-RU")}</span>
          </div>
          <div className="text-[12px] text-oh-graphite">
            {positions} {plural(positions, "позиция", "позиции", "позиций")} · {qty} шт · {STATUS[order.status] || order.status}
            {order.payment_status && ` · ${PAY[order.payment_status] || order.payment_status}`}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 small:justify-end">
        <span className="text-[16px] font-semibold text-oh-ink" data-testid="order-amount">{formatRub(order.total)}</span>
        <LocalizedClientLink href={`/account/orders/details/${order.id}`} className="oh-btn-ghost !py-1.5 !text-[13px]" data-testid="card-details-link">
          Подробнее
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
