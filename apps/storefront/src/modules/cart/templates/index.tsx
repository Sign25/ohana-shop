"use client"

import { useCart } from "@/lib/context/cart-context"
import { checkSpendingLimit } from "@/lib/util/check-spending-limit"
import { plural } from "@/lib/util/ohana"
import ApprovalStatusBanner from "@/modules/cart/components/approval-status-banner"
import EmptyCartMessage from "@/modules/cart/components/empty-cart-message"
import SignInPrompt from "@/modules/cart/components/sign-in-prompt"
import ItemsTemplate from "@/modules/cart/templates/items"
import Summary from "@/modules/cart/templates/summary"
import { B2BCustomer } from "@/types/global"
import { useMemo } from "react"

const CartTemplate = ({ customer }: { customer: B2BCustomer | null }) => {
  const { cart } = useCart()
  const spendLimitExceeded = useMemo(() => checkSpendingLimit(cart, customer), [cart, customer])
  const totalItems = useMemo(() => cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0, [cart?.items])
  const positions = cart?.items?.length || 0

  return (
    <div className="bg-oh-paper/60 py-6 small:py-10">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="flex flex-col gap-y-5">
            <h1 className="oh-h text-[30px]">
              Корзина <span className="text-oh-muted text-[18px]">{positions} {plural(positions, "позиция", "позиции", "позиций")} · {totalItems} шт</span>
            </h1>
            <div className="grid grid-cols-1 gap-4 small:grid-cols-[1fr_380px]">
              <div className="flex flex-col gap-y-2">
                {!customer && <SignInPrompt />}
                {cart?.approvals && cart.approvals.length > 0 && <ApprovalStatusBanner cart={cart} />}
                <ItemsTemplate cart={cart} />
              </div>
              <div className="relative">
                <div className="sticky top-40 flex flex-col gap-y-8">
                  {cart && cart.region && <Summary customer={customer} spendLimitExceeded={spendLimitExceeded} />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
