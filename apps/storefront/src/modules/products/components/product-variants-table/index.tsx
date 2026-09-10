import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { getProductPrice } from "@/lib/util/get-product-price"
import { formatRub, OPT_THRESHOLD, plural } from "@/lib/util/ohana"
import { HttpTypes, StoreProduct, StoreProductVariant } from "@medusajs/types"
import { clx, Table } from "@medusajs/ui"
import { useMemo, useState } from "react"
import BulkTableQuantity from "../bulk-table-quantity"

type Line = StoreProductVariant & { product: StoreProduct; quantity: number }

/**
 * Заказ размерным рядом. По аудиту: быстрые кнопки «полный ряд» и «все по N», живой итог,
 * честное disabled-состояние кнопки, колонка цены только когда цены по размерам различаются,
 * тач-цели 44px, на телефоне — список вместо таблицы.
 */
const ProductVariantsTable = ({ product, region }: { product: HttpTypes.StoreProduct; region: HttpTypes.StoreRegion }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [lines, setLines] = useState<Map<string, Line>>(new Map())
  const [fillKey, setFillKey] = useState(0) // перерисовка счётчиков после быстрой заливки

  const variants = product.variants || []
  const stepOf = (v: any) => Math.max(1, Number(v.metadata?.qty_step) || 1)
  const stockOf = (v: any): number | undefined => (typeof v.inventory_quantity === "number" ? v.inventory_quantity : undefined)
  const priceOf = (v: any) => getProductPrice({ product, variantId: v.id }).variantPrice
  const amounts = variants.map((v) => Number(priceOf(v)?.calculated_price_number) || 0)
  const uniformPrice = amounts.length > 0 && amounts.every((a) => a === amounts[0])

  const totalQty = Array.from(lines.values()).reduce((a, l) => a + l.quantity, 0)
  const totalSum = Array.from(lines.values()).reduce((a, l) => a + l.quantity * (Number(priceOf(l)?.calculated_price_number) || 0), 0)

  const setQty = (variantId: string, quantity: number) => {
    setLines((prev) => {
      const next = new Map(prev)
      if (quantity <= 0) { next.delete(variantId); return next }
      const v = variants.find((x) => x.id === variantId)!
      next.set(variantId, { ...(prev.get(variantId) || { ...v, product }), quantity } as Line)
      return next
    })
  }

  /** Быстрая заливка: n упаковок каждого размера, что есть в наличии (0 — очистить) */
  const fill = (packs: number) => {
    const next = new Map<string, Line>()
    if (packs > 0) {
      for (const v of variants) {
        const step = stepOf(v), stock = stockOf(v)
        let q = step * packs
        if (stock !== undefined) q = Math.min(q, Math.floor(stock / step) * step)
        if (q > 0) next.set(v.id, { ...v, product, quantity: q } as Line)
      }
    }
    setLines(next)
    setFillKey((k) => k + 1)
  }

  const handleAddToCart = async () => {
    setIsAdding(true)
    addToCartEventBus.emitCartAdd({
      lineItems: Array.from(lines.values()).map(({ quantity, ...variant }) => ({ productVariant: { ...variant }, quantity })),
      regionId: region.id,
    })
    setIsAdding(false)
  }

  const visibleOptions = (product.options || []).filter((o) => o.title !== "Default option" && (o.values?.length ?? 0) > 1)
  const optionValue = (variant: any, optionId: string) => variant.options?.find((o: any) => o.option_id === optionId)?.value
  const anyStock = variants.some((v) => (stockOf(v) ?? 1) > 0)
  const allSamePack = new Set(variants.map(stepOf)).size === 1
  const packWord = allSamePack && stepOf(variants[0]) > 1 ? `по ${stepOf(variants[0])} шт` : "по 1 упаковке"

  const initialFor = (v: any) => lines.get(v.id)?.quantity ?? 0

  return (
    <div className="flex flex-col gap-3">
      {anyStock && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-oh-graphite">Быстрый набор:</span>
          <button type="button" onClick={() => fill(1)} className="oh-chip">Полный ряд {packWord}</button>
          <button type="button" onClick={() => fill(2)} className="oh-chip">Ряд ×2</button>
          {totalQty > 0 && (
            <button type="button" onClick={() => fill(0)} className="text-oh-muted underline decoration-dotted hover:text-oh-primary">очистить</button>
          )}
        </div>
      )}

      {/* Телефон: список размеров */}
      <ul className="flex flex-col divide-y divide-oh-line rounded-xl border border-oh-line bg-white small:hidden">
        {variants.map((variant) => {
          const qty = stockOf(variant)
          return (
            <li key={variant.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-oh-ink">
                  {visibleOptions.map((o) => optionValue(variant, o.id)).filter(Boolean).join(", ") || variant.title}
                </div>
                <div className="text-[12.5px] text-oh-graphite">
                  {!uniformPrice && priceOf(variant)?.calculated_price}
                  {!uniformPrice && qty !== undefined && ", "}
                  {qty !== undefined && (qty > 0 ? `${qty} шт в наличии` : "нет в наличии")}
                </div>
              </div>
              <div className="w-[150px] shrink-0">
                <BulkTableQuantity key={`${variant.id}-${fillKey}`} variantId={variant.id} onChange={setQty} step={stepOf(variant)} max={qty} initial={initialFor(variant)} />
              </div>
            </li>
          )
        })}
      </ul>

      {/* Десктоп: таблица */}
      <div className="hidden overflow-x-auto p-px small:block">
        <Table className="w-full overflow-hidden rounded-xl border-none shadow-borders-base">
          <Table.Header className="border-t-0">
            <Table.Row className="border-none bg-oh-paper hover:!bg-oh-paper">
              <Table.HeaderCell className="px-4">Артикул</Table.HeaderCell>
              {visibleOptions.map((option) => (
                <Table.HeaderCell key={option.id} className="border-x px-4">{option.title}</Table.HeaderCell>
              ))}
              {!uniformPrice && <Table.HeaderCell className="border-x px-4">Цена</Table.HeaderCell>}
              <Table.HeaderCell className="border-r px-3">Остаток</Table.HeaderCell>
              <Table.HeaderCell className="px-4">Количество</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body className="border-none">
            {variants.map((variant, index) => {
              const qty = stockOf(variant)
              return (
                <Table.Row key={variant.id} className={clx({ "border-b-0": index === variants.length - 1 })}>
                  <Table.Cell className="px-4">{variant.sku}</Table.Cell>
                  {visibleOptions.map((productOption) => (
                    <Table.Cell key={productOption.id} className="border-x px-4">{optionValue(variant, productOption.id)}</Table.Cell>
                  ))}
                  {!uniformPrice && <Table.Cell className="whitespace-nowrap border-x px-4">{priceOf(variant)?.calculated_price}</Table.Cell>}
                  <Table.Cell className="whitespace-nowrap border-r px-3 text-center text-oh-graphite">
                    {qty !== undefined ? (qty > 0 ? qty : "—") : ""}
                  </Table.Cell>
                  <Table.Cell className="pl-2 !pr-2">
                    <BulkTableQuantity key={`${variant.id}-${fillKey}`} variantId={variant.id} onChange={setQty} step={stepOf(variant)} max={qty} initial={initialFor(variant)} />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>

      {/* Живой итог */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
        {totalQty > 0 ? (
          <span className="text-oh-ink">
            Выбрано <b>{totalQty} {plural(totalQty, "штука", "штуки", "штук")}</b> на <b>{formatRub(totalSum)}</b>
            {totalSum < OPT_THRESHOLD && <span className="text-oh-graphite"> (минимальный заказ {formatRub(OPT_THRESHOLD)} — можно добрать другими моделями)</span>}
          </span>
        ) : (
          <span className="text-oh-graphite">Укажите количество по размерам{uniformPrice && amounts[0] ? `, цена ${formatRub(amounts[0])} за шт` : ""}</span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={totalQty === 0 || isAdding}
        className={clx("oh-btn h-12 w-full text-[16px]", totalQty === 0 && "!bg-oh-line-2 !text-oh-graphite")}
        data-testid="add-product-button"
      >
        {totalQty === 0 ? "Выберите размеры, чтобы добавить в корзину" : isAdding ? "Добавляем…" : `В корзину — ${totalQty} шт на ${formatRub(totalSum)}`}
      </button>
    </div>
  )
}

export default ProductVariantsTable
