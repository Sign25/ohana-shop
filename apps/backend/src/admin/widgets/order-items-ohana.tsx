import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/client"

/**
 * Карточка заказа → «Состав для сборки»: артикул, название, цвет, размер · рост, ОГ-ОТ-ОБ, количество и упаковки —
 * то, что на старом сайте показывали чипы в строках заказа и лист подбора. Сортировка по артикулу.
 */
type Item = { num: number; image: string; code: string; name: string; color: string; size: string; rost: string; params: string; qty: number; is_set: boolean; sets: number; per_set: number; variant_title: string }

const OrderItemsWidget = ({ data }: { data: any }) => {
  const { data: d } = useQuery({ queryKey: ["ohana-order-items", data?.id], queryFn: () => sdk.client.fetch<{ items: Item[]; summary: string }>(`/admin/ohana/orders/${data.id}/items`), enabled: !!data?.id })
  if (!d) return null
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Состав для сборки</Heading>
        <Text size="small" className="text-ui-fg-subtle">{d.summary}</Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row><Table.HeaderCell>№</Table.HeaderCell><Table.HeaderCell></Table.HeaderCell><Table.HeaderCell>Артикул</Table.HeaderCell><Table.HeaderCell>Название</Table.HeaderCell><Table.HeaderCell>Цвет</Table.HeaderCell><Table.HeaderCell>Размер · рост</Table.HeaderCell><Table.HeaderCell>ОГ-ОТ-ОБ</Table.HeaderCell><Table.HeaderCell className="text-right">Кол-во</Table.HeaderCell></Table.Row>
        </Table.Header>
        <Table.Body>
          {d.items.map((it) => (
            <Table.Row key={it.num}>
              <Table.Cell className="text-ui-fg-subtle">{it.num}</Table.Cell>
              <Table.Cell>{it.image ? <img src={it.image} alt="" className="h-12 w-9 rounded object-cover" /> : null}</Table.Cell>
              <Table.Cell><code className="text-xs font-semibold">{it.code}</code></Table.Cell>
              <Table.Cell>{it.name}</Table.Cell>
              <Table.Cell>{it.color}</Table.Cell>
              <Table.Cell className="whitespace-nowrap">{it.size}{it.rost ? ` · ${it.rost}` : ""}</Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{it.params}</Table.Cell>
              <Table.Cell className="text-right whitespace-nowrap"><b>{it.qty}</b> шт{it.is_set && <Badge size="2xsmall" color="blue" className="ml-2">{it.sets} компл × {it.per_set}</Badge>}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.after" })
export default OrderItemsWidget
