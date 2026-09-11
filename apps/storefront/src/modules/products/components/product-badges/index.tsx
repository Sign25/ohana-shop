import { productBadges } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

const TONE: Record<string, string> = {
  primary: "bg-oh-primary text-white", azure: "bg-oh-azure text-white", mint: "bg-oh-mint-deep text-white", gold: "bg-oh-gold text-white", graphite: "bg-white/95 text-oh-graphite border border-oh-line-2",
}

/** Бейджи поверх фото: «Акция» отдельно слева вверху, остальные — справа внизу (как на старом сайте) */
const ProductBadges = ({ product, size = "sm" }: { product: HttpTypes.StoreProduct; size?: "sm" | "lg" }) => {
  const badges = productBadges(product)
  if (!badges.length) return null
  const promo = badges.find((b) => b.key === "promo"), rest = badges.filter((b) => b.key !== "promo")
  const cls = (tone: string) => clx("rounded-pill font-medium shadow-sm", TONE[tone], size === "lg" ? "px-3 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]")
  return (
    <>
      {promo && <div className="pointer-events-none absolute left-2 top-2 z-[1]"><span className={cls(promo.tone)}>{promo.label}</span></div>}
      {rest.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-[1] flex flex-wrap justify-end gap-1">
          {rest.map((b) => <span key={b.key} className={cls(b.tone)}>{b.label}</span>)}
        </div>
      )}
    </>
  )
}

export default ProductBadges
