import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingBag } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/client"

/**
 * «Заказы опта» — рабочий список менеджера: кто, на сколько, оплачен ли, отгружен ли, ушёл ли в 1С,
 * быстрые фильтры и печать счёта / листа подбора без захода в карточку.
 */
type Row = { id: string; display_id: number; created_at: string; email: string; status: string; payment_status: string; fulfillment_status: string; total: number; buyer: string; inn: string; city: string; phone: string; qty: number; tier: string; onec: string; onec_status: string; notes: string }
/** Штатный /admin/orders отдаёт вычисленные статусы оплаты и отгрузки; всё остальное (юрлицо, ИНН, 1С) — из metadata */
const toRow = (o: any): Row => {
  const m = o.metadata || {}, a = o.shipping_address || {}
  return {
    id: o.id, display_id: o.display_id, created_at: o.created_at, email: o.email, status: o.status, payment_status: o.payment_status, fulfillment_status: o.fulfillment_status, total: Number(o.total) || 0,
    buyer: m.invoice_recipient || a.company || `${a.first_name || ""} ${a.last_name || ""}`.trim(), inn: m.cost_center || "", city: a.city || "", phone: m.contact_phone || a.phone || "",
    qty: (o.items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0), tier: (o.items || []).some((i: any) => i.metadata?.tier === "krupny") ? "krupny" : "opt",
    onec: m.onec_number ? String(m.onec_number) : m.onec_exported_at ? "выгружен" : "", onec_status: m.onec_status || "", notes: m.notes || "",
  }
}
const applyFilter = (rows: Row[], f: string, q: string) => {
  let r = rows
  if (f === "new") r = r.filter((x) => x.status === "pending" && x.payment_status !== "captured")
  if (f === "unpaid") r = r.filter((x) => x.status !== "canceled" && x.payment_status !== "captured")
  if (f === "unshipped") r = r.filter((x) => x.status !== "canceled" && !["shipped", "delivered", "partially_shipped"].includes(x.fulfillment_status))
  if (f === "not1c") r = r.filter((x) => x.status !== "canceled" && !x.onec)
  const s = q.trim().toLowerCase()
  if (s) r = r.filter((x) => [x.display_id, x.email, x.buyer, x.inn, x.city, x.phone, x.onec].join(" ").toLowerCase().includes(s))
  return r
}
const FILTERS: [string, string][] = [["all", "Все"], ["new", "Новые"], ["unpaid", "Не оплачены"], ["unshipped", "Не отгружены"], ["not1c", "Не в 1С"]]
const PAY: Record<string, [string, any]> = { captured: ["Оплачен", "green"], authorized: ["Ждёт оплаты", "orange"], awaiting: ["Ждёт оплаты", "orange"], not_paid: ["Не оплачен", "orange"], refunded: ["Возврат", "grey"], canceled: ["Отменён", "red"], partially_captured: ["Частично", "orange"] }
const FUL: Record<string, [string, any]> = { not_fulfilled: ["Не собран", "grey"], fulfilled: ["Собран", "blue"], partially_fulfilled: ["Собран частично", "blue"], shipped: ["Отгружен", "green"], partially_shipped: ["Отгружен частично", "green"], delivered: ["Доставлен", "green"], canceled: ["Отменён", "red"] }
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`

const WholesaleOrders = () => {
  const [f, setF] = useState("new"), [q, setQ] = useState("")
  const { data: raw, isPending } = useQuery({ queryKey: ["ohana-orders"], queryFn: () => sdk.client.fetch<{ orders: any[] }>(`/admin/orders?limit=300&order=-created_at&fields=id,display_id,created_at,email,status,payment_status,fulfillment_status,total,metadata,*shipping_address,items.quantity,items.metadata`) })
  const rows = applyFilter((raw?.orders || []).map(toRow), f, q)
  const data = raw ? { orders: rows, count: rows.length } : undefined
  const St = ({ map, v }: { map: Record<string, [string, any]>; v: string }) => { const [l, c] = map[v] || [v, "grey"]; return <Badge size="2xsmall" color={c}>{l}</Badge> }
  return (
    <Container className="flex flex-col overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <Heading>Заказы опта</Heading>
          <Text size="small" className="text-ui-fg-subtle">Оплата фиксируется в карточке заказа («Capture payment»), отгрузка — «Create fulfillment» → «Mark as shipped» с номером накладной ТК.</Text>
        </div>
        <Input placeholder="№, покупатель, ИНН, город, телефон" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
      </div>
      <div className="flex gap-2 px-6 pb-4">
        {FILTERS.map(([k, l]) => <Button key={k} size="small" variant={f === k ? "primary" : "secondary"} onClick={() => setF(k)}>{l}</Button>)}
        {data && <Text size="small" className="self-center text-ui-fg-subtle">{data.count} шт.</Text>}
      </div>
      {isPending && <Text className="px-6 pb-4">Загрузка…</Text>}
      <Table>
        <Table.Header>
          <Table.Row><Table.HeaderCell>№</Table.HeaderCell><Table.HeaderCell>Дата</Table.HeaderCell><Table.HeaderCell>Покупатель</Table.HeaderCell><Table.HeaderCell>Город</Table.HeaderCell><Table.HeaderCell className="text-right">Сумма</Table.HeaderCell><Table.HeaderCell>Оплата</Table.HeaderCell><Table.HeaderCell>Отгрузка</Table.HeaderCell><Table.HeaderCell>1С</Table.HeaderCell><Table.HeaderCell></Table.HeaderCell></Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.orders || []).map((o) => (
            <Table.Row key={o.id}>
              <Table.Cell><Link to={`/orders/${o.id}`} className="font-semibold text-ui-fg-interactive">#{o.display_id}</Link></Table.Cell>
              <Table.Cell className="whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("ru-RU")}</Table.Cell>
              <Table.Cell><div className="max-w-[260px]"><div className="truncate">{o.buyer || o.email}</div><div className="text-xs text-ui-fg-subtle">{[o.inn && `ИНН ${o.inn}`, o.phone].filter(Boolean).join(" · ")}</div></div></Table.Cell>
              <Table.Cell>{o.city}</Table.Cell>
              <Table.Cell className="text-right whitespace-nowrap"><b>{rub(o.total)}</b><div className="text-xs text-ui-fg-subtle">{o.qty} шт{o.tier === "krupny" ? " · крупный опт" : ""}</div></Table.Cell>
              <Table.Cell>{o.status === "canceled" ? <Badge size="2xsmall" color="red">Отменён</Badge> : <St map={PAY} v={o.payment_status} />}</Table.Cell>
              <Table.Cell><St map={FUL} v={o.fulfillment_status} /></Table.Cell>
              <Table.Cell className="whitespace-nowrap text-xs">{o.onec ? <>{o.onec}{o.onec_status ? <div className="text-ui-fg-subtle">{o.onec_status}</div> : null}</> : <span className="text-ui-fg-muted">—</span>}</Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                <button className="text-xs text-ui-fg-interactive hover:underline" onClick={() => window.open(`/admin/ohana/orders/${o.id}/invoice`, "_blank")}>Счёт</button>
                <span className="mx-1 text-ui-fg-muted">·</span>
                <button className="text-xs text-ui-fg-interactive hover:underline" onClick={() => window.open(`/admin/ohana/orders/${o.id}/packing-slip`, "_blank")}>Лист подбора</button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Заказы опта", icon: ShoppingBag })
export default WholesaleOrders
