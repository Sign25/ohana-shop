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
  // вес заказа: вес варианта в граммах; у комплекта/упаковки 1С даёт вес всего вложения (≥1 кг) — делим на количество в упаковке
  const grams = cart.items?.reduce((a: number, i: any) => {
    const v = i.variant || {}, pm = i.product?.metadata || {}, vm = v.metadata || {}
    const per = Number(pm.set_qty) || Number(vm.pack_qty) || 1
    let w = Number(v.weight) || Number(i.product?.weight) || 0
    if (w >= 1000 && vm.pack_unit !== "Y" && per > 1) w = w / per
    return a + w * (vm.pack_unit === "Y" ? per : 1) * i.quantity
  }, 0) || 0

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
      {grams > 0 && (
        <div className="flex justify-between">
          <span>Вес заказа</span>
          <span data-testid="cart-weight">{grams >= 1000 ? `≈ ${(grams / 1000).toFixed(grams >= 10000 ? 0 : 1)} кг` : `${Math.round(grams)} г`}</span>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <span className="shrink-0">Доставка</span>
        <span className="text-right" data-testid="cart-shipping">{shipping_total ? money(shipping_total) : "до терминала ТК в Омске — бесплатно"}</span>
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
