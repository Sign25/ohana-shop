"use client"

import { useCart } from "@/lib/context/cart-context"
import { formatRub } from "@/lib/util/ohana"
import DeleteButton from "@/modules/common/components/delete-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useEffect, useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  showBorders?: boolean
  currencyCode: string
  disabled?: boolean
}

/** Строка корзины: фото, артикул и размер, цена за шт (с пометкой «крупный опт»), количество кратно упаковке */
const ItemFull = ({ item, showBorders = true, disabled }: ItemProps) => {
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const { handleDeleteItem, handleUpdateCartQuantity } = useCart()
  const meta = (item.variant?.metadata || {}) as any
  const step = Math.max(1, Number(meta.qty_step) || 1)
  const max = item.variant?.inventory_quantity ?? 100000
  const tier = (item.metadata as any)?.tier
  const base = Number((item.metadata as any)?.base_price) || 0

  useEffect(() => setQuantity(item.quantity.toString()), [item.quantity])

  const change = async (q: number) => {
    const v = Math.min(max, Math.max(0, step > 1 ? Math.ceil(q / step) * step : q))
    if (v <= 0) return handleDeleteItem(item.id)
    setQuantity(v.toString())
    await handleUpdateCartQuantity(item.id, v)
  }

  return (
    <div className={clx("flex w-full items-center gap-4 bg-white p-3", showBorders && "oh-card")}>
      <LocalizedClientLink href={`/products/${item.product_handle}`} className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-oh-paper">
        {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="72px" className="object-cover" />}
      </LocalizedClientLink>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <LocalizedClientLink href={`/products/${item.product_handle}`} className="line-clamp-2 text-[13.5px] font-medium text-oh-ink hover:text-oh-azure">
          {item.product?.title || item.title}
        </LocalizedClientLink>
        <div className="text-[12.5px] text-oh-graphite">
          {item.variant?.sku && <span>Арт. {item.variant.sku} · </span>}
          {item.variant?.title}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className={clx(tier === "krupny" ? "text-oh-azure" : "text-oh-graphite")}>
            {formatRub(item.unit_price)} за шт
            {tier === "krupny" && base > item.unit_price && <span className="ml-1 text-oh-muted line-through">{formatRub(base)}</span>}
          </span>
          {step > 1 && <span className="text-oh-muted">упак. {step} шт</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-pill border border-oh-line">
            <button type="button" onClick={() => change(item.quantity - step)} disabled={disabled} className="h-10 w-10 text-oh-graphite hover:text-oh-azure disabled:opacity-40" aria-label="Меньше">−</button>
            <input
              type="number"
              value={quantity}
              min={0}
              step={step}
              disabled={disabled}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={(e) => change(Number(e.target.value) || 0)}
              onKeyDown={(e) => e.key === "Enter" && change(Number(quantity) || 0)}
              inputMode="numeric"
              className="h-10 w-16 border-x border-oh-line bg-transparent text-center text-[14px] text-oh-ink [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button type="button" onClick={() => change(item.quantity + step)} disabled={disabled || item.quantity + step > max} className="h-10 w-10 text-oh-graphite hover:text-oh-azure disabled:opacity-40" aria-label="Больше">+</button>
          </div>
          <DeleteButton id={item.id} disabled={disabled} />
        </div>
      </div>
      <div className="hidden shrink-0 text-right small:block">
        <div className="text-[15px] font-semibold text-oh-ink">{formatRub((item.total ?? item.unit_price * item.quantity) as number)}</div>
        <div className="text-[12px] text-oh-muted">{item.quantity} шт</div>
      </div>
    </div>
  )
}

export default ItemFull
