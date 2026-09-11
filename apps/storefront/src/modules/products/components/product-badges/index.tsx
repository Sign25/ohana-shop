import { productBadges } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

/**
 * Бейджи поверх фото, как на старом сайте: «Акция» — отдельно слева вверху (цепляется взглядом первой),
 * остальные — столбиком в правом нижнем углу (bottom 12%), капслок 11px, радиус 6px, тень; на карточке — крупнее.
 */
const ProductBadges = ({ product, size = "sm", wb }: { product: HttpTypes.StoreProduct; size?: "sm" | "lg"; wb?: { rating: number; count: number } | null }) => {
  const badges = productBadges(product, wb)
  if (!badges.length) return null
  const promo = badges.find((b) => b.key === "promo"), rest = badges.filter((b) => b.key !== "promo")
  const cls = clx("inline-block whitespace-nowrap rounded-[6px] font-bold uppercase tracking-[.4px] text-white shadow-[0_2px_6px_rgba(0,0,0,.18)]", size === "lg" ? "px-3 py-1.5 text-[12px]" : "px-2 py-[3px] text-[11px]")
  return (
    <>
      {promo && (
        <div className={clx("pointer-events-none absolute z-[1]", size === "lg" ? "left-3 top-3" : "left-2 top-2")}>
          <span className={cls} style={{ background: promo.color }}>{promo.label}</span>
        </div>
      )}
      {rest.length > 0 && (
        <div className={clx("pointer-events-none absolute bottom-[12%] z-[1] flex flex-col items-end", size === "lg" ? "right-3.5 gap-2" : "right-2 gap-[5px]")}>
          {rest.map((b) => <span key={b.key} className={cls} style={{ background: b.color }}>{b.label}</span>)}
        </div>
      )}
    </>
  )
}

export default ProductBadges
