import { formatRub, plural, productSummary, saleMode, variantOpt, variantSale } from "@/lib/util/ohana"
import ProductBadges from "@/modules/products/components/product-badges"
import WbRatingLine from "@/modules/products/components/wb-rating"
import { WbRating } from "@/lib/data/wb"
import CardImage from "@/modules/products/components/card-image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const sizeKey = (v: any) => String(v.metadata?.size || v.title || "").trim().split(/\s+/)[0].replace(/см$/i, "")
const sizeNum = (v: any) => { const m = sizeKey(v).match(/\d+/); return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER }

/**
 * Карточка товара в списках (каталог, главная, похожие). Оптовику важно за секунду понять:
 * что это, какие размеры есть, почём за штуку и за комплект/упаковку, и сколько на складе — поэтому
 * под названием идёт полоска размеров (в наличии — обычные, закончились — перечёркнутые),
 * цена крупная, крупный опт — лазурью, статус склада — в подвале. Фото 3:4, при наведении второе фото
 * и полоса «Выбрать размеры». Бейджи — по правилам старого сайта (product-badges).
 */
export default async function ProductPreview({
  product,
  wb,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region?: HttpTypes.StoreRegion
  /** рейтинг Wildberries по артикулу (см. lib/data/wb.ts) */
  wb?: WbRating | null
}) {
  if (!product) return null
  const s = productSummary(product)
  const sm = saleMode(product)
  const piece = (x: number) => (sm.priceIsPerPack && sm.perUnit > 1 ? x / sm.perUnit : x)
  const variants = [...((product.variants || []) as any[])].sort((a, b) => sizeNum(a) - sizeNum(b))
  const sale = variants.map((v) => variantSale(v)).filter((x) => x > 0)
  const minSale = sale.length ? piece(Math.min(...sale)) : null
  const opt = s.minPrice !== null ? piece(s.minPrice) : null
  const krupny = s.minKrupny !== null ? piece(s.minKrupny) : null

  // название без дубля артикула и цвета (они показаны отдельной строкой), полное — на карточке
  const colorLabel = String((product.metadata as any)?.color_label || "").trim()
  let title = product.title
  if (s.code) title = title.replace(new RegExp(`,?\\s*(артикул:?\\s*)?${esc(s.code)}\\b`, "i"), "")
  if (colorLabel) title = title.replace(new RegExp(`,\\s*${esc(colorLabel)}\\s*$`, "i"), "")
  // хвосты вида «(330 мл (24 банки в упаковке))» — упаковка показана отдельным чипом
  title = title.replace(/\s*\([\s\S]*?(?:упаковк|в уп\.)[\s\S]*\)\s*$/i, "")
  title = title.replace(/\s{2,}/g, " ").replace(/[,\s]+$/, "").trim() || product.title
  const colorHint = colorLabel && !title.toLowerCase().includes(colorLabel.toLowerCase().split(/[ ,]/)[0].replace(/(ый|ая|ое|ые|ий|яя)$/, "")) ? colorLabel : ""

  const img = product.thumbnail || product.images?.[0]?.url
  const images = (product.images || []).map((i) => i.url).filter((u) => u && u !== img)
  const hoverImg = images[0] || null

  // полоска размеров: только для поштучных товаров с несколькими размерами
  const sizeChips = sm.mode === "pieces" && variants.length > 1 ? variants.map((v) => ({ key: sizeKey(v), on: (v.inventory_quantity ?? 0) > 0 })).filter((c) => c.key) : []
  const MAX = 8
  const shownChips = sizeChips.slice(0, MAX), moreChips = sizeChips.length - shownChips.length

  const units = s.packQty && s.packQty > 1 ? Math.floor(s.stock / s.packQty) : s.stock
  const stockText =
    s.stock <= 0 ? "Нет в наличии"
    : sm.mode === "set" ? `${units} ${plural(units, "комплект", "комплекта", "комплектов")}`
    : sm.mode !== "pieces" ? `${units} ${plural(units, "упаковка", "упаковки", "упаковок")}`
    : s.inStockSizes < s.sizesTotal ? `${s.inStockSizes} из ${s.sizesTotal} ${plural(s.sizesTotal, "размера", "размеров", "размеров")}`
    : "Все размеры"
  const low = s.stock > 0 && s.packQty && s.stock < s.packQty * 3

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group block h-full" data-testid="product-wrapper">
      <article className="flex h-full flex-col overflow-hidden rounded-card border border-oh-line bg-white transition-[box-shadow,border-color,transform] duration-300 motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:border-oh-line-2 group-hover:shadow-[0_14px_34px_rgba(58,58,58,0.12)]">
        <div className="relative overflow-hidden">
          {img ? (
            <CardImage src={img} alt={product.title} hoverSrc={hoverImg} />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-oh-paper text-xs text-oh-muted">нет фото</div>
          )}
          {s.stock <= 0 && (
            <span className="absolute left-2 top-2 rounded-[6px] bg-white/92 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[.4px] text-oh-graphite shadow-[0_2px_6px_rgba(0,0,0,.12)]">
              Всё разобрали
            </span>
          )}
          <ProductBadges product={product} wb={wb} />
          {/* подсказка-действие при наведении (десктоп) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full bg-white/95 py-2 text-center text-[12.5px] font-semibold text-oh-azure backdrop-blur-[2px] transition-transform duration-300 motion-reduce:transition-none group-hover:translate-y-0 small:block">
            {s.stock <= 0 ? "Оставить заявку →" : sm.mode === "set" ? "Заказать комплект →" : sm.mode !== "pieces" ? "Заказать упаковки →" : "Выбрать размеры →"}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3.5 pt-3">
          <div className="flex items-baseline justify-between gap-2 text-[11.5px] leading-4 text-oh-muted">
            <span className="tabular-nums">{s.code ? `Арт. ${s.code}` : " "}</span>
            {colorHint && <span className="truncate text-right">{colorHint}</span>}
          </div>
          <h3 className="line-clamp-3 min-h-[2.5em] text-[14px] font-medium leading-[1.25] text-oh-ink" data-testid="product-title">
            {title}
          </h3>
          <WbRatingLine wb={wb} compact reserve />

          {sizeChips.length > 0 ? (
            <div className="flex flex-wrap gap-1" aria-label="Размеры">
              {shownChips.map((c, i) => (
                <span key={`${c.key}-${i}`} className={clx("rounded-[5px] border px-1.5 text-[11px] leading-[18px] tabular-nums", c.on ? "border-oh-line-2 text-oh-graphite" : "border-dashed border-oh-line text-oh-line-2 line-through")}>{c.key}</span>
              ))}
              {moreChips > 0 && <span className="px-1 text-[11px] leading-[18px] text-oh-muted">+{moreChips}</span>}
            </div>
          ) : sm.mode !== "pieces" ? (
            <div><span className="rounded-[5px] border border-oh-azure/30 bg-oh-azure/5 px-1.5 text-[11px] leading-[18px] text-oh-azure">{sm.mode === "set" ? `Комплект${s.sizeRange ? ` ${s.sizeRange}` : ""} · ${sm.perUnit} шт` : `Упаковка ${sm.perUnit} шт`}</span></div>
          ) : null}

          <div className="mt-auto flex flex-col gap-0.5 pt-2">
            {opt !== null ? (
              <div className="flex flex-wrap items-baseline gap-x-1.5" data-testid="price">
                <span className={clx("text-[18px] font-semibold leading-none", minSale !== null ? "text-oh-primary" : "text-oh-ink")}>
                  {formatRub(minSale ?? opt)}
                </span>
                <span className="text-[11.5px] text-oh-muted">/шт</span>
                {minSale !== null ? (
                  <s className="text-[12px] text-oh-muted">{formatRub(opt)}</s>
                ) : s.minPrice !== s.maxPrice ? (
                  <span className="text-[11.5px] text-oh-muted">от</span>
                ) : null}
              </div>
            ) : (
              <div className="text-[13px] text-oh-muted">цена по запросу</div>
            )}
            {opt !== null && sm.mode !== "pieces" && (
              <div className="text-[12px] text-oh-graphite">{sm.mode === "set" ? "комплект" : "упаковка"} {sm.perUnit} шт = <b className="font-medium text-oh-ink">{formatRub((minSale ?? opt) * sm.perUnit)}</b></div>
            )}
            {minSale === null && krupny !== null && opt !== null && krupny < opt && (
              <div className="whitespace-nowrap text-[12px] text-oh-azure" title="Цена крупного опта — при корзине от 100 000 ₽">крупный опт <b className="font-semibold">{formatRub(krupny)}</b></div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-t border-dashed border-oh-line pt-2 text-[12px]">
            <span className={clx("flex items-center gap-1.5", s.stock > 0 ? "text-oh-graphite" : "text-oh-muted")}>
              <span className={clx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", s.stock <= 0 ? "bg-oh-line-2" : low ? "bg-oh-gold" : "bg-oh-mint-deep")} />
              <span>{stockText}</span>
            </span>
            {sm.mode === "pieces" && s.packQty && s.packQty > 1 && <span className="shrink-0 text-oh-muted">упак. {s.packQty} шт</span>}
          </div>
        </div>
      </article>
    </LocalizedClientLink>
  )
}
