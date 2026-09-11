"use client"

import { addToCartBulk, retrieveCartSummary } from "@/lib/data/cart"
import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { getProductPrice } from "@/lib/util/get-product-price"
import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD, plural, saleMode } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import ProductDemand from "@/modules/products/components/product-demand"
import { HttpTypes } from "@medusajs/types"
import { clx, Table } from "@medusajs/ui"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import BulkTableQuantity from "../bulk-table-quantity"

/**
 * Заказ на карточке — три механики, как на текущем сайте:
 *  • поштучно кратно упаковке (каталог ОПТ+РОЗН): таблица размеров, быстрые кнопки «полный ряд»;
 *  • комплектом («Номенклатура 2026»): одна строка, счётчик в комплектах (полная размерная линейка);
 *  • упаковками (продукты): счётчик в упаковках, цена за штуку и за упаковку.
 * Под таблицей — «Ваш расчёт»: цена на текущем уровне (опт / крупный опт / акция) с учётом того, что уже в корзине,
 * экономия, вес, итог и сколько не хватает до опта 35 000 ₽ или крупного опта 100 000 ₽.
 */
const ProductVariantsTable = ({ product, region }: { product: HttpTypes.StoreProduct; region: HttpTypes.StoreRegion }) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const sm = saleMode(product)
  const unitMode = sm.mode !== "pieces" // счётчик в комплектах/упаковках
  const [units, setUnits] = useState<Map<string, number>>(new Map()) // variantId → единиц заказа (шт / компл. / упак.)
  const [fillKey, setFillKey] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const [cart, setCart] = useState<{ subtotal: number; count: number } | null>(null)

  useEffect(() => { retrieveCartSummary().then((c) => setCart(c ? { subtotal: c.subtotal, count: c.count } : { subtotal: 0, count: 0 })).catch(() => setCart({ subtotal: 0, count: 0 })) }, [])

  const sizeNum = (v: any) => { const m = String(v.metadata?.size || v.title || "").match(/\d+/); return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER }
  const variants = useMemo(() => [...(product.variants || [])].sort((a, b) => sizeNum(a) - sizeNum(b)), [product])
  const per = sm.perUnit
  const stepOf = (v: any) => (unitMode ? 1 : Math.max(1, Number(v.metadata?.qty_step) || 1))
  const rawStock = (v: any): number | undefined => (typeof v.inventory_quantity === "number" ? v.inventory_quantity : undefined)
  /** остаток в единицах заказа: упаковки 'Y' хранятся в упаковках, остальное — в штуках */
  const stockUnits = (v: any): number | undefined => { const s = rawStock(v); if (s === undefined) return undefined; return sm.mode === "set" || sm.mode === "packS" ? Math.floor(s / per) : s }
  const cartQty = (q: number) => (sm.mode === "set" || sm.mode === "packS" ? q * per : q)
  const piecesOf = (q: number) => (unitMode ? q * per : q)

  // цены за штуку (у 'Y' цена в БД — за упаковку)
  const basePrice = (v: any) => Number(getProductPrice({ product, variantId: v.id }).variantPrice?.calculated_price_number) || 0
  const perPiece = (x: number) => (sm.priceIsPerPack && per > 1 ? x / per : x)
  const optPiece = (v: any) => perPiece(basePrice(v))
  const krupnyPiece = (v: any) => perPiece(Number(v.metadata?.price_krupny) || 0)
  const salePiece = (v: any) => perPiece(Number(v.metadata?.price_sale) || 0)
  const gramsPiece = (v: any) => { const w = Number(v.weight) || Number(product.weight) || 0; return w >= 1000 && sm.mode !== "packY" && per > 1 ? w / per : w }

  const sel = Array.from(units.entries()).map(([id, q]) => ({ v: variants.find((x) => x.id === id)!, q })).filter((x) => x.v && x.q > 0)
  const pieces = sel.reduce((a, x) => a + piecesOf(x.q), 0)
  const unitCount = sel.reduce((a, x) => a + x.q, 0)
  const optSum = sel.reduce((a, x) => a + piecesOf(x.q) * optPiece(x.v), 0)
  const cartSum = cart?.subtotal ?? 0
  const level = cartSum + optSum
  const krupnyActive = level >= KRUPNY_THRESHOLD
  const effPiece = (v: any) => { const s = salePiece(v), k = krupnyPiece(v); return s > 0 ? s : krupnyActive && k > 0 ? k : optPiece(v) }
  const totalSum = sel.reduce((a, x) => a + piecesOf(x.q) * effPiece(x.v), 0)
  const saving = Math.max(0, optSum - totalSum)
  const grams = sel.reduce((a, x) => a + piecesOf(x.q) * gramsPiece(x.v), 0)
  const hasKrupny = variants.some((v: any) => krupnyPiece(v) > 0)
  const krupnySumIfActive = sel.reduce((a, x) => a + piecesOf(x.q) * (salePiece(x.v) > 0 ? salePiece(x.v) : krupnyPiece(x.v) || optPiece(x.v)), 0)
  const anySale = sel.some((x) => salePiece(x.v) > 0)
  const tierLabel = anySale && sel.every((x) => salePiece(x.v) > 0) ? "Акция" : krupnyActive ? "Крупный опт" : "Опт"

  const amounts = variants.map((v) => optPiece(v))
  const uniformPrice = amounts.length > 0 && amounts.every((a) => a === amounts[0])
  const anyStock = variants.some((v) => (rawStock(v) ?? 1) > 0)

  const setQty = (variantId: string, q: number) => setUnits((prev) => { const n = new Map(prev); q > 0 ? n.set(variantId, q) : n.delete(variantId); return n })
  /** быстрая заливка: n единиц (упаковок/комплектов/шагов) каждого размера с остатком; 0 — очистить */
  const fill = (n: number) => {
    const next = new Map<string, number>()
    if (n > 0) for (const v of variants) {
      const st = stepOf(v), max = stockUnits(v)
      let q = st * n
      if (max !== undefined) q = Math.min(q, Math.floor(max / st) * st)
      if (q > 0) next.set(v.id, q)
    }
    setUnits(next); setFillKey((k) => k + 1)
  }

  const handleAddToCart = async () => {
    if (!sel.length) return
    setIsAdding(true)
    try {
      await addToCartBulk({ lineItems: sel.map((x) => ({ variant_id: x.v.id, quantity: cartQty(x.q) })), countryCode })
      addToCartEventBus.emitCartAdd({ lineItems: sel.map((x) => ({ productVariant: { ...(x.v as any), product }, quantity: cartQty(x.q) })), regionId: region.id })
      setAdded(`Добавили в корзину: ${pieces} шт на ${formatRub(totalSum)}`)
      setCart((c) => ({ subtotal: (c?.subtotal ?? 0) + optSum, count: (c?.count ?? 0) + pieces }))
      fill(0)
      router.refresh()
    } catch { setAdded("Не получилось добавить — обновите страницу и попробуйте снова.") }
    setIsAdding(false)
  }

  if (!anyStock) return <ProductDemand productId={product.id} />

  const visibleOptions = (product.options || []).filter((o) => o.title !== "Default option" && (o.values?.length ?? 0) > 1)
  const optionValue = (variant: any, optionId: string) => variant.options?.find((o: any) => o.option_id === optionId)?.value
  const unitTitle = (v: any) => {
    const size = String(v.metadata?.size || (product.metadata as any)?.size_range || "").trim()
    if (sm.mode === "set") return `Комплект${size ? ` · размеры ${size}` : ""} · ${per} шт`
    return `Упаковка ${per} шт${size && variants.length > 1 ? ` · ${size}` : ""}`
  }
  const unitWord = (n: number) => plural(n, ...sm.unitWordPlural)
  const allSamePack = new Set(variants.map((v: any) => Number(v.metadata?.qty_step) || 1)).size === 1
  const packWord = allSamePack && stepOf(variants[0]) > 1 ? `по ${stepOf(variants[0])} шт` : "по 1 упаковке"

  const unitPriceLine = (v: any) => {
    const p = effPiece(v)
    return unitMode ? `${formatRub(p)}/шт · ${formatRub(p * per)} за ${sm.unitWord === "шт" ? "шт" : sm.unitWord === "комплект" ? "комплект" : "упаковку"}` : `${formatRub(p)}/шт`
  }

  return (
    <div className="flex flex-col gap-3">
      {/* быстрый набор */}
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-oh-graphite">Быстрый набор:</span>
        {unitMode ? (
          [1, 2, 5].map((n) => <button key={n} type="button" onClick={() => fill(n)} className="oh-chip">{n} {unitWord(n)}</button>)
        ) : (
          <>
            <button type="button" onClick={() => fill(1)} className="oh-chip">Полный ряд {packWord}</button>
            <button type="button" onClick={() => fill(2)} className="oh-chip">Ряд ×2</button>
          </>
        )}
        {unitCount > 0 && <button type="button" onClick={() => fill(0)} className="text-oh-muted underline decoration-dotted hover:text-oh-primary">очистить</button>}
      </div>

      {unitMode ? (
        /* комплекты и упаковки: карточка на строку */
        <ul className="flex flex-col divide-y divide-oh-line rounded-xl border border-oh-line bg-white">
          {variants.map((variant: any) => {
            const max = stockUnits(variant)
            return (
              <li key={variant.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 small:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-oh-ink">{unitTitle(variant)}</div>
                  <div className="text-[12.5px] text-oh-graphite">
                    {unitPriceLine(variant)}
                    {max !== undefined && (max > 0 ? ` · в наличии ${max} ${unitWord(max)}` : " · нет в наличии")}
                  </div>
                </div>
                <div className="w-[150px] shrink-0">
                  <BulkTableQuantity key={`${variant.id}-${fillKey}`} variantId={variant.id} onChange={setQty} step={1} max={max} initial={units.get(variant.id) ?? 0} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <>
          {/* телефон: список размеров */}
          <ul className="flex flex-col divide-y divide-oh-line rounded-xl border border-oh-line bg-white small:hidden">
            {variants.map((variant: any) => {
              const qty = rawStock(variant)
              return (
                <li key={variant.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-oh-ink">{visibleOptions.map((o) => optionValue(variant, o.id)).filter(Boolean).join(", ") || variant.title}</div>
                    <div className="text-[12.5px] text-oh-graphite">
                      {!uniformPrice && `${formatRub(effPiece(variant))}, `}
                      {qty !== undefined && (qty > 0 ? `${qty} шт в наличии` : "нет в наличии")}
                    </div>
                  </div>
                  <div className="w-[150px] shrink-0">
                    <BulkTableQuantity key={`${variant.id}-${fillKey}`} variantId={variant.id} onChange={setQty} step={stepOf(variant)} max={qty} initial={units.get(variant.id) ?? 0} />
                  </div>
                </li>
              )
            })}
          </ul>
          {/* десктоп: таблица */}
          <div className="hidden overflow-x-auto p-px small:block">
            <Table className="w-full overflow-hidden rounded-xl border-none shadow-borders-base">
              <Table.Header className="border-t-0">
                <Table.Row className="border-none bg-oh-paper hover:!bg-oh-paper">
                  <Table.HeaderCell className="px-4">Артикул</Table.HeaderCell>
                  {visibleOptions.map((o) => <Table.HeaderCell key={o.id} className="border-x px-4">{o.title}</Table.HeaderCell>)}
                  {!uniformPrice && <Table.HeaderCell className="border-x px-4">Цена</Table.HeaderCell>}
                  <Table.HeaderCell className="border-r px-3">Остаток</Table.HeaderCell>
                  <Table.HeaderCell className="px-4">Количество</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body className="border-none">
                {variants.map((variant: any, index) => {
                  const qty = rawStock(variant)
                  return (
                    <Table.Row key={variant.id} className={clx({ "border-b-0": index === variants.length - 1 })}>
                      <Table.Cell className="px-4">{variant.sku}</Table.Cell>
                      {visibleOptions.map((o) => <Table.Cell key={o.id} className="border-x px-4">{optionValue(variant, o.id)}</Table.Cell>)}
                      {!uniformPrice && <Table.Cell className="whitespace-nowrap border-x px-4">{formatRub(effPiece(variant))}</Table.Cell>}
                      <Table.Cell className="whitespace-nowrap border-r px-3 text-center text-oh-graphite">{qty !== undefined ? (qty > 0 ? qty : "—") : ""}</Table.Cell>
                      <Table.Cell className="pl-2 !pr-2">
                        <BulkTableQuantity key={`${variant.id}-${fillKey}`} variantId={variant.id} onChange={setQty} step={stepOf(variant)} max={qty} initial={units.get(variant.id) ?? 0} />
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        </>
      )}

      {/* Ваш расчёт */}
      <div className="rounded-card border border-oh-line bg-oh-paper p-4" data-testid="ohana-calc">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-oh-ink">Ваш расчёт</span>
          <span className={clx("rounded-pill px-2.5 py-0.5 text-[12px] font-medium", tierLabel === "Крупный опт" ? "bg-oh-azure text-white" : tierLabel === "Акция" ? "bg-oh-primary text-white" : "border border-oh-line-2 bg-white text-oh-graphite")}>{tierLabel}</span>
        </div>
        {pieces > 0 ? (
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13.5px] tabular-nums">
            <dt className="text-oh-graphite">Количество</dt>
            <dd className="text-right text-oh-ink">{pieces} шт{unitMode && ` · ${unitCount} ${unitWord(unitCount)}`}</dd>
            <dt className="text-oh-graphite">Цена за штуку</dt>
            <dd className="text-right text-oh-ink">
              {sel.length === 1 || new Set(sel.map((x) => effPiece(x.v))).size === 1 ? formatRub(effPiece(sel[0].v)) : `${formatRub(Math.min(...sel.map((x) => effPiece(x.v))))} – ${formatRub(Math.max(...sel.map((x) => effPiece(x.v))))}`}
              {unitMode && sel.length === 1 && <span className="text-oh-graphite"> · {formatRub(effPiece(sel[0].v) * per)} за {sm.mode === "set" ? "комплект" : "упаковку"}</span>}
            </dd>
            {saving > 0 && (<><dt className="text-oh-azure">Экономия крупного опта</dt><dd className="text-right font-medium text-oh-azure">−{formatRub(saving)}</dd></>)}
            {grams > 0 && (<><dt className="text-oh-graphite">Вес</dt><dd className="text-right text-oh-ink">{grams >= 1000 ? `${(grams / 1000).toFixed(grams >= 10000 ? 0 : 1)} кг` : `${Math.round(grams)} г`}</dd></>)}
            <dt className="border-t border-oh-line pt-1.5 text-[15px] font-semibold text-oh-ink">Итого</dt>
            <dd className="border-t border-oh-line pt-1.5 text-right text-[17px] font-semibold text-oh-ink">{formatRub(totalSum)}</dd>
          </dl>
        ) : (
          <p className="text-[13.5px] text-oh-graphite">
            {unitMode ? `Укажите количество ${sm.mode === "set" ? "комплектов" : "упаковок"}` : "Укажите количество по размерам"}
            {uniformPrice && amounts[0] > 0 && ` — цена ${formatRub(effPiece(variants[0]))} за шт`}
            {hasKrupny && krupnyActive && " (в корзине уже крупный опт — действует цена крупного опта)"}
          </p>
        )}

        {/* прогресс до опта / крупного опта с учётом корзины */}
        <div className="mt-3">
          <div className="relative h-2 w-full overflow-hidden rounded-pill bg-white">
            <div className={clx("h-full rounded-pill transition-[width]", krupnyActive ? "bg-oh-azure" : level >= OPT_THRESHOLD ? "bg-oh-mint-deep" : "bg-oh-gold")} style={{ width: `${Math.min(100, (level / KRUPNY_THRESHOLD) * 100)}%` }} />
            <span className="absolute top-0 h-full w-px bg-oh-line-2" style={{ left: `${(OPT_THRESHOLD / KRUPNY_THRESHOLD) * 100}%` }} />
          </div>
          <div className="mt-1.5 text-[12.5px] text-oh-graphite">
            {cart === null ? "Считаем корзину…" : level < OPT_THRESHOLD ? (
              <>До минимального опта ({formatRub(OPT_THRESHOLD)}) не хватает <b className="text-oh-ink">{formatRub(OPT_THRESHOLD - level)}</b>{cartSum > 0 && <> — в корзине уже {formatRub(cartSum)}</>}. Можно добрать другими моделями.</>
            ) : !krupnyActive ? (
              <>Опт набран{cartSum > 0 && <> (с корзиной {formatRub(level)})</>}. {hasKrupny && <>До крупного опта не хватает <b className="text-oh-ink">{formatRub(KRUPNY_THRESHOLD - level)}</b>{pieces > 0 && krupnySumIfActive < totalSum && <> — эта позиция станет дешевле на {formatRub(totalSum - krupnySumIfActive)}</>}.</>}</>
            ) : (
              <>Крупный опт: цены крупного опта применяются ко всей корзине ({formatRub(level)}).</>
            )}
          </div>
        </div>
      </div>

      {added && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-oh-mint-deep/40 bg-white px-4 py-2.5 text-[14px] text-oh-ink">
          <span>{added}</span>
          <LocalizedClientLink href="/cart" className="font-medium text-oh-azure hover:underline">Перейти в корзину →</LocalizedClientLink>
        </div>
      )}

      <button type="button" onClick={handleAddToCart} disabled={pieces === 0 || isAdding} className={clx("oh-btn h-12 w-full text-[16px]", pieces === 0 && "!bg-oh-line-2 !text-oh-graphite")} data-testid="add-product-button">
        {pieces === 0
          ? unitMode ? `Выберите ${sm.mode === "set" ? "комплекты" : "упаковки"}, чтобы добавить в корзину` : "Выберите размеры, чтобы добавить в корзину"
          : isAdding ? "Добавляем…" : `В корзину — ${unitMode ? `${unitCount} ${unitWord(unitCount)} (${pieces} шт)` : `${pieces} шт`} на ${formatRub(totalSum)}`}
      </button>
    </div>
  )
}

export default ProductVariantsTable
