import { plural, productSummary } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"

const ProductFacts = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const s = productSummary(product)
  const dot = (ok: boolean) => (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-oh-mint-deep" : "bg-oh-line-2"}`} />
  )
  return (
    <div className="flex w-full flex-col gap-1.5 text-[13px] text-oh-graphite">
      <span className="flex items-center gap-2">
        {dot(s.stock > 0)}
        {s.stock > 0
          ? `В наличии ${s.stock} шт · ${s.inStockSizes} из ${s.sizesTotal} ${plural(s.sizesTotal, "размера", "размеров", "размеров")}`
          : "Нет в наличии — оставьте заявку, сообщим о поступлении"}
      </span>
      {s.packQty && s.packQty > 1 && (
        <span className="flex items-center gap-2">
          {dot(true)}
          {s.packUnit === "Y"
            ? `Продаётся упаковками по ${s.packQty} шт`
            : `В упаковке ${s.packQty} шт — заказ кратно упаковке`}
        </span>
      )}
      <span className="flex items-center gap-2">
        {dot(true)}
        Отгрузка со склада в Омске 24–48 часов, доставка до терминала ТК бесплатно
      </span>
    </div>
  )
}

export default ProductFacts
