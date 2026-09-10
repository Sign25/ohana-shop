import { retrieveOrder } from "@/lib/data/orders"
import EcPurchase from "@/modules/analytics/ec-purchase"
import OrderCompletedTemplate from "@/modules/order/templates/order-completed-template"
import { B2BOrder } from "@/types/global"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Заказ оформлен",
  description: "Спасибо за заказ",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = (await retrieveOrder(params.id).catch(() => null)) as B2BOrder

  if (!order) {
    return notFound()
  }

  return (
    <>
      <EcPurchase order={order as any} />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
