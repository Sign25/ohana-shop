import StoreBreadcrumb from "@/modules/store/components/store-breadcrumb"
import QuickOrder from "@/modules/tools/quick-order"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Быстрый заказ — Ohana Market",
  description: "Матричный оптовый заказ: найдите модель по артикулу и наберите количество прямо в размерной сетке.",
}

export default function QuickOrderPage() {
  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <StoreBreadcrumb current="Быстрый заказ" />
        <h1 className="oh-h text-[30px]">Быстрый заказ</h1>
        <QuickOrder />
      </div>
    </div>
  )
}
