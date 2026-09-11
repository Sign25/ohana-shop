import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD, productSummary, saleMode, variantSale } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"

/**
 * Плитки цен: опт и крупный опт (порог 100 000 ₽ применяется автоматически), для акции — акционная цена вместо обеих.
 * Комплект и упаковка: цена за штуку + стоимость комплекта/упаковки; у продуктов с ценой за упаковку ('Y') — наоборот.
 */
export default function ProductPrice({ product }: { product: HttpTypes.StoreProduct }) {
  const s = productSummary(product)
  const sm = saleMode(product)
  if (s.minPrice === null) return <div className="text-sm text-oh-muted">Цена по запросу</div>
  const per = sm.perUnit
  const piece = (x: number) => (sm.priceIsPerPack && per > 1 ? x / per : x)
  const minOpt = piece(s.minPrice), maxOpt = piece(s.maxPrice ?? s.minPrice)
  const same = minOpt === maxOpt
  const sale = (product.variants || []).map((v: any) => variantSale(v)).filter((x) => x > 0)
  const minSale = sale.length ? piece(Math.min(...sale)) : null
  const krupny = s.minKrupny !== null ? piece(s.minKrupny) : null
  const unitNote = per > 1 ? (sm.mode === "set" ? `комплект ${per} шт` : `упаковка ${per} шт`) : ""
  const fmt = (x: number) => (same ? formatRub(x) : `от ${formatRub(x)}`)

  return (
    <div className="grid grid-cols-2 gap-2">
      {minSale !== null ? (
        <div className="rounded-card border border-oh-primary/40 bg-oh-primary/5 p-3">
          <div className="text-[13px] text-oh-primary">Акция</div>
          <div className="text-[22px] font-semibold text-oh-primary" data-testid="product-price" data-value={minSale}>{fmt(minSale)}</div>
          <div className="text-[12.5px] text-oh-graphite">за штуку, вместо <s>{formatRub(minOpt)}</s>{unitNote && ` · ${unitNote} = ${formatRub(minSale * per)}`}</div>
        </div>
      ) : (
        <div className="rounded-card border border-oh-line bg-white p-3">
          <div className="text-[13px] text-oh-graphite">Опт</div>
          <div className="text-[22px] font-semibold text-oh-ink" data-testid="product-price" data-value={minOpt}>{fmt(minOpt)}</div>
          <div className="text-[12.5px] text-oh-graphite">за штуку, заказ от {formatRub(OPT_THRESHOLD)}{unitNote && <><br />{unitNote} = {formatRub(minOpt * per)}</>}</div>
        </div>
      )}
      {krupny !== null && minSale === null && (
        <div className="rounded-card border border-oh-azure/30 bg-oh-azure/5 p-3">
          <div className="text-[13px] text-oh-azure">Крупный опт</div>
          <div className="text-[22px] font-semibold text-oh-azure">{fmt(krupny)}</div>
          <div className="text-[12.5px] text-oh-azure">при корзине от {formatRub(KRUPNY_THRESHOLD)}{unitNote && <><br />{unitNote} = {formatRub(krupny * per)}</>}</div>
        </div>
      )}
      {minSale !== null && (
        <div className="rounded-card border border-oh-line bg-white p-3">
          <div className="text-[13px] text-oh-graphite">Без акции</div>
          <div className="text-[22px] font-semibold text-oh-graphite">{fmt(minOpt)}</div>
          <div className="text-[12.5px] text-oh-graphite">опт{krupny !== null && ` · крупный опт ${fmt(krupny)}`}</div>
        </div>
      )}
    </div>
  )
}
