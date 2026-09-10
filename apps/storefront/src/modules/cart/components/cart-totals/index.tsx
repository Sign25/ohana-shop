"use client"

import { useCart } from "@/lib/context/cart-context"
import { convertToLocale } from "@/lib/util/money"
import { plural } from "@/lib/util/ohana"
import Divider from "@/modules/common/components/divider"
import React from "react"

const CartTotals: React.FC = () => {
  const { isUpdatingCart, cart } = useCart()
  if (!cart) return null

  const { currency_code, total, item_subtotal, shipping_total, discount_total } = cart
  const qty = cart.items?.reduce((a: number, i: any) => a + i.quantity, 0) || 0
  const tier = cart.items?.some((i: any) => i.metadata?.tier === "krupny") ? "крупный опт" : "опт"
  const money = (a?: number | null) => convertToLocale({ amount: a ?? 0, currency_code })

  return (
    <div className="flex flex-col gap-y-1.5 text-[13px] text-oh-graphite">
      <div className="flex justify-between">
        <span>{qty} {plural(qty, "штука", "штуки", "штук")} · цена «{tier}»</span>
        <span data-testid="cart-item-subtotal" data-value={item_subtotal || 0}>{money(item_subtotal)}</span>
      </div>
      {!!discount_total && (
        <div className="flex justify-between">
          <span>Скидка</span>
          <span className="text-oh-azure" data-testid="cart-discount">− {money(discount_total)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Доставка</span>
        <span data-testid="cart-shipping">{shipping_total ? money(shipping_total) : "до терминала ТК в Омске бесплатно"}</span>
      </div>
      <Divider className="my-1" />
      <div className="flex items-center justify-between text-oh-ink">
        <span className="font-medium">Итого</span>
        {isUpdatingCart ? (
          <div className="h-6 w-28 animate-pulse rounded-full bg-oh-line" />
        ) : (
          <span className="text-[20px] font-semibold" data-testid="cart-total" data-value={total || 0}>{money(total)}</span>
        )}
      </div>
    </div>
  )
}

export default CartTotals
