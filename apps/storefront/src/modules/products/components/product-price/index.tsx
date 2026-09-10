import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD, productSummary } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"

/** Блок цен как на текущем сайте: опт и крупный опт (порог 100 000 ₽ применяется автоматически) */
export default function ProductPrice({ product }: { product: HttpTypes.StoreProduct }) {
  const s = productSummary(product)
  if (s.minPrice === null) {
    return <div className="text-sm text-oh-muted">Цена по запросу</div>
  }
  const same = s.minPrice === s.maxPrice
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-card border border-oh-line bg-white p-3">
        <div className="text-[13px] text-oh-graphite">Опт</div>
        <div className="text-[22px] font-semibold text-oh-ink" data-testid="product-price" data-value={s.minPrice}>
          {same ? formatRub(s.minPrice) : `от ${formatRub(s.minPrice)}`}
        </div>
        <div className="text-[12.5px] text-oh-graphite">за штуку, заказ от {formatRub(OPT_THRESHOLD)}</div>
      </div>
      {s.minKrupny !== null && (
        <div className="rounded-card border border-oh-azure/30 bg-oh-azure/5 p-3">
          <div className="text-[13px] text-oh-azure">Крупный опт</div>
          <div className="text-[22px] font-semibold text-oh-azure">{same ? formatRub(s.minKrupny) : `от ${formatRub(s.minKrupny)}`}</div>
          <div className="text-[12.5px] text-oh-azure">при корзине от {formatRub(KRUPNY_THRESHOLD)}</div>
        </div>
      )}
    </div>
  )
}
