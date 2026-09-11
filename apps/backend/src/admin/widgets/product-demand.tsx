import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/client"

/** Карточка товара в админке: кто ждёт распроданный товар («Мне это нужно» на витрине) */
const ProductDemandWidget = ({ data }: { data: any }) => {
  const { data: d } = useQuery({ queryKey: ["ohana-demand", data?.id], queryFn: () => sdk.client.fetch<{ demands: { email: string; created_at: string }[] }>(`/admin/ohana/demand?product_id=${data.id}`), enabled: !!data?.id })
  if (!d || !d.demands.length) return null
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4"><Heading level="h2">Ждут поступления</Heading><Text size="small" className="text-ui-fg-subtle">{d.demands.length}</Text></div>
      <div className="flex flex-col gap-1 px-6 py-4">
        {d.demands.slice(0, 50).map((x) => <Text key={x.email} size="small">{x.email} <span className="text-ui-fg-subtle">· {new Date(x.created_at).toLocaleDateString("ru-RU")}</span></Text>)}
      </div>
    </Container>
  )
}
export const config = defineWidgetConfig({ zone: "product.details.side.after" })
export default ProductDemandWidget
