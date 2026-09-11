import { formatRub, plural, productSummary, saleMode } from "@/lib/util/ohana"
import ProductBadges from "@/modules/products/components/product-badges"
import CardImage from "@/modules/products/components/card-image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

/**
 * Карточка товара в каталоге: фото 3:4, артикул, название, цена опт / крупный опт,
 * наличие по размерам и упаковка. Без быстрой корзины: опт заказывают размерным рядом на странице товара.
 */
export default async function ProductPreview({
  product,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region?: HttpTypes.StoreRegion
}) {
  if (!product) return null
  const s = productSummary(product)
  const sm = saleMode(product)
  const piece = (x: number) => (sm.priceIsPerPack && sm.perUnit > 1 ? x / sm.perUnit : x)
  const sale = (product.variants || []).map((v: any) => Number(v.metadata?.price_sale) || 0).filter((x) => x > 0)
  const minSale = sale.length ? piece(Math.min(...sale)) : null
  const colorLabel = String((product.metadata as any)?.color_label || "").trim()
  const colorHint = colorLabel && !product.title.toLowerCase().includes(colorLabel.toLowerCase().split(/[ ,]/)[0].replace(/(ый|ая|ое|ые|ий|яя)$/, "")) ? colorLabel : ""
  const img = product.thumbnail || product.images?.[0]?.url
  // подпись о наличии только когда есть что сказать: распродано или ряд неполный
  const stockLabel =
    s.stock <= 0
      ? "Нет в наличии"
      : s.inStockSizes < s.sizesTotal
      ? `в наличии ${s.inStockSizes} из ${s.sizesTotal} ${plural(s.sizesTotal, "размера", "размеров", "размеров")}`
      : ""

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group block h-full" data-testid="product-wrapper">
      <div className="oh-card flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-[0_10px_30px_rgba(74,74,74,0.10)]">
        <div className="relative">
          {img ? (
            <CardImage src={img} alt={product.title} />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-white text-xs text-oh-muted">нет фото</div>
          )}
          {s.stock <= 0 && (
            <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-2.5 py-1 text-[12px] font-medium text-oh-graphite">
              Всё разобрали
            </span>
          )}
          <ProductBadges product={product} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          {s.code && <div className="text-[12px] text-oh-muted">Арт. {s.code}</div>}
          <div className="line-clamp-2 min-h-[2.6em] text-[13.5px] font-medium leading-snug text-oh-ink" data-testid="product-title">
            {product.title}
          </div>
          {/* цвет из 1С, если он не входит в название (в каталоге «Номенклатура 2026» одно название на несколько расцветок) */}
          {colorHint && <div className="-mt-1 text-[12px] text-oh-muted">{colorHint}</div>}
          <div className="mt-auto flex flex-col gap-0.5 pt-1">
            {s.minPrice !== null ? (
              <div className="text-[17px] font-semibold text-oh-ink" data-testid="price">
                {minSale !== null ? (
                  <><span className="text-oh-primary">{formatRub(minSale)}</span> <s className="text-[13px] font-normal text-oh-muted">{formatRub(piece(s.minPrice))}</s></>
                ) : s.minPrice === s.maxPrice ? formatRub(piece(s.minPrice)) : `от ${formatRub(piece(s.minPrice))}`}
                <span className="text-[12px] font-normal text-oh-muted">/шт</span>
              </div>
            ) : (
              <div className="text-sm text-oh-muted">цена по запросу</div>
            )}
            {sm.mode !== "pieces" && s.minPrice !== null && (
              <div className="text-[12.5px] text-oh-graphite">{sm.mode === "set" ? "комплект" : "упаковка"} {sm.perUnit} шт · {formatRub((minSale ?? piece(s.minPrice)) * sm.perUnit)}</div>
            )}
            {minSale === null && s.minKrupny !== null && s.minKrupny < (s.minPrice ?? Infinity) && (
              <div className="text-[13px] text-oh-azure">
                крупный опт от {formatRub(piece(s.minKrupny))}
              </div>
            )}
          </div>
          {(stockLabel || (s.packQty && s.packQty > 1)) && (
            <div className="flex items-center justify-between gap-2 pt-1 text-[12.5px]">
              <span className={clx("flex items-center gap-1.5", s.stock > 0 ? "text-oh-graphite" : "text-oh-muted")}>
                {stockLabel && <span className={clx("inline-block h-1.5 w-1.5 rounded-full", s.stock > 0 ? "bg-oh-gold" : "bg-oh-line-2")} />}
                {stockLabel}
              </span>
              {sm.mode === "pieces" && s.packQty && s.packQty > 1 && <span className="text-oh-graphite">упаковка {s.packQty} шт</span>}
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
