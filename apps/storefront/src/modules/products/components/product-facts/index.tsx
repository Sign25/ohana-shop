import { plural, productSummary } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const fmtDate = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d || ""
}

const ProductFacts = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const s = productSummary(product)
  const m = (product.metadata || {}) as Record<string, any>
  const cert = String(m.cert_doc || "").replace(/¶/g, "").trim()
  const dot = (ok: boolean) => (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-oh-mint-deep" : "bg-oh-line-2"}`} />
  )
  return (
    <div className="flex w-full flex-col gap-1.5 text-[13px] text-oh-graphite">
      <span className="flex items-center gap-2">
        {dot(s.stock > 0)}
        {s.stock > 0
          ? m.lineika && s.packQty
            ? `В наличии ${Math.floor(s.stock / s.packQty)} ${plural(Math.floor(s.stock / s.packQty), "комплект", "комплекта", "комплектов")} (${s.stock} шт)`
            : (s.packUnit === "S" && s.packQty) ? `В наличии ${Math.floor(s.stock / s.packQty)} ${plural(Math.floor(s.stock / s.packQty), "упаковка", "упаковки", "упаковок")}`
            : s.packUnit === "Y" ? `В наличии ${s.stock} ${plural(s.stock, "упаковка", "упаковки", "упаковок")}`
            : `В наличии ${s.stock} шт · ${s.inStockSizes} из ${s.sizesTotal} ${plural(s.sizesTotal, "размера", "размеров", "размеров")}`
          : "Нет в наличии — оставьте заявку, сообщим о поступлении"}
      </span>
      {m.lineika ? (
        <span className="flex items-center gap-2">
          {dot(true)}
          Продаётся только комплектом — полной размерной линейкой{s.sizeRange ? ` ${s.sizeRange}` : ""}{s.packQty && s.packQty > 1 ? `, ${s.packQty} шт в комплекте` : ""}
        </span>
      ) : s.packQty && s.packQty > 1 ? (
        <span className="flex items-center gap-2">
          {dot(true)}
          {s.packUnit === "Y" || s.packUnit === "S"
            ? `Продаётся упаковками по ${s.packQty} шт`
            : `В упаковке ${s.packQty} шт — заказ кратно упаковке`}
        </span>
      ) : null}
      <span className="flex items-center gap-2">
        {dot(true)}
        Отгрузка со склада в Омске 24–48 часов, доставка до терминала ТК бесплатно
      </span>
      {cert && (
        <span className="flex items-start gap-2">
          <span className="mt-1.5">{dot(true)}</span>
          <span>
            Сертификат {cert}
            {m.cert_until ? ` действует до ${fmtDate(m.cert_until)}` : ""} ·{" "}
            <LocalizedClientLink href="/p/sertificat" className="text-oh-azure hover:underline">
              документы для маркетплейсов
            </LocalizedClientLink>
          </span>
        </span>
      )}
    </div>
  )
}

export default ProductFacts
