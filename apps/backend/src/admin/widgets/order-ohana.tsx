import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"

/**
 * Карточка заказа → сбоку: реквизиты оптовика для счёта, комментарий, уровень цен, состояние обмена с 1С,
 * кнопка печати счёта. Данные лежат в order.metadata (заполняются на шаге «Реквизиты» оформления).
 */
const Row = ({ l, v }: { l: string; v?: any }) => (v ? <div className="flex flex-col gap-0.5"><Text size="xsmall" className="text-ui-fg-subtle">{l}</Text><Text size="small" leading="compact">{String(v)}</Text></div> : null)

const OrderOhanaWidget = ({ data }: { data: any }) => {
  const m = data?.metadata || {}
  const tier = (data?.items || []).some((i: any) => i.metadata?.tier === "krupny") ? "Крупный опт" : "Опт"
  const onec = m.onec_number ? `№ ${m.onec_number}${m.onec_status ? ` · ${m.onec_status}` : ""}` : m.onec_exported_at ? `выгружен ${new Date(m.onec_exported_at).toLocaleString("ru-RU")}` : "ещё не выгружен"
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Оптовый заказ</Heading>
        <Badge size="2xsmall" color={tier === "Крупный опт" ? "blue" : "grey"}>{tier}</Badge>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <Row l="Плательщик (для счёта)" v={m.invoice_recipient} />
        <div className="grid grid-cols-2 gap-3">
          <Row l="ИНН" v={m.cost_center} />
          <Row l="КПП" v={m.kpp} />
        </div>
        <Row l="Юридический адрес" v={m.legal_address} />
        <Row l="Телефон по заказу" v={m.contact_phone} />
        <Row l="Номер заявки покупателя" v={m.requisition_number} />
        <Row l="Отметка на грузе / для ТК" v={m.door_code} />
        <Row l="Комментарий покупателя" v={m.notes} />
        {!m.invoice_recipient && <Text size="small" className="text-ui-fg-muted">Покупатель не указал реквизиты — заказ оформлен без шага «Реквизиты» или через API.</Text>}
      </div>
      <div className="flex flex-col gap-2 px-6 py-4">
        <Row l="Обмен с 1С" v={onec} />
        <div className="flex gap-2">
          <Button size="small" variant="secondary" onClick={() => window.open(`/admin/ohana/orders/${data.id}/invoice`, "_blank")}>Счёт на оплату</Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.side.before" })
export default OrderOhanaWidget
