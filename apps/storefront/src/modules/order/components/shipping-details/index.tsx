import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"

type ShippingDetailsProps = { order: HttpTypes.StoreOrder }

/** Ссылка на отслеживание по ТК: по названию способа доставки или по самому номеру накладной */
const trackUrl = (num: string, method: string) => {
  const m = method.toLowerCase(), n = encodeURIComponent(num)
  if (/пэк|pec/.test(m)) return `https://pecom.ru/services-are/order-status/?code=${n}`
  if (/делов|dellin/.test(m)) return `https://www.dellin.ru/tracker/?id=${n}`
  if (/сдэк|cdek|sdek/.test(m)) return `https://www.cdek.ru/ru/tracking?order_id=${n}`
  if (/почт|post/.test(m)) return `https://www.pochta.ru/tracking#${n}`
  if (/энерг|nrg/.test(m)) return `https://nrg-tk.ru/client/tracking/?number=${n}`
  if (/байкал/.test(m)) return `https://www.baikalsr.ru/tracking/?id=${n}`
  return ""
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const a = order.shipping_address
  const method = (order.shipping_methods || []).map((s) => s.name).join(", ")
  const shipments = ((order as any).fulfillments || []).filter((f: any) => f.shipped_at && !f.canceled_at)
  return (
    <>
      <Heading level="h3" className="mb-2">Доставка</Heading>
      {method && <Text className="txt-medium text-ui-fg-subtle">{method}</Text>}
      {a && (
        <div className="mt-1">
          <Text className="txt-medium text-ui-fg-subtle">{[a.company, `${a.first_name || ""} ${a.last_name || ""}`.trim()].filter(Boolean).join(" · ")}</Text>
          <Text className="txt-medium text-ui-fg-subtle">{[a.postal_code, a.city, a.province, a.address_1].filter(Boolean).join(", ")}</Text>
          {a.phone && <Text className="txt-medium text-ui-fg-subtle">{a.phone}</Text>}
        </div>
      )}
      {shipments.length > 0 && (
        <div className="mt-3 rounded-lg bg-oh-paper p-3">
          <Text className="text-[13px] font-semibold text-oh-ink">Отгружено</Text>
          {shipments.map((f: any) => (
            <div key={f.id} className="mt-1 text-[13px] text-oh-graphite">
              {new Date(f.shipped_at).toLocaleDateString("ru-RU")}
              {(f.labels || []).map((l: any) => {
                const url = l.tracking_url || trackUrl(l.tracking_number, method)
                return (
                  <span key={l.id} className="ml-2">
                    накладная{" "}
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="text-oh-azure underline">{l.tracking_number}</a> : <b>{l.tracking_number}</b>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default ShippingDetails
