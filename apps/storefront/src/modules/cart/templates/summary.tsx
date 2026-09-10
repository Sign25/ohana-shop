"use client"

import { useCart } from "@/lib/context/cart-context"
import { checkSpendingLimit } from "@/lib/util/check-spending-limit"
import { getCheckoutStep } from "@/lib/util/get-checkout-step"
import { formatRub, OPT_THRESHOLD } from "@/lib/util/ohana"
import CartToCsvButton from "@/modules/cart/components/cart-to-csv-button"
import CartTotals from "@/modules/cart/components/cart-totals"
import TierBar from "@/modules/cart/components/tier-bar"
import PromotionCode from "@/modules/checkout/components/promotion-code"
import Divider from "@/modules/common/components/divider"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { RequestQuoteConfirmation } from "@/modules/quotes/components/request-quote-confirmation"
import { RequestQuotePrompt } from "@/modules/quotes/components/request-quote-prompt"
import { B2BCustomer } from "@/types"
import { ApprovalStatusType } from "@/types/approval"

type SummaryProps = {
  customer: B2BCustomer | null
  spendLimitExceeded: boolean
}

const Summary = ({ customer, spendLimitExceeded }: SummaryProps) => {
  const { handleEmptyCart, cart } = useCart()
  if (!cart) return null

  const checkoutStep = getCheckoutStep(cart)
  const checkoutPath = checkoutStep ? `/checkout?step=${checkoutStep}` : "/checkout"
  const checkoutButtonLink = customer ? checkoutPath : "/account"
  const isPendingApproval = cart?.approvals?.some((a) => a?.status === ApprovalStatusType.PENDING)
  const belowMin = (cart.item_subtotal ?? 0) < OPT_THRESHOLD
  const limitExceeded = checkSpendingLimit(cart, customer) || spendLimitExceeded

  return (
    <div className="oh-card flex flex-col gap-y-3 p-5">
      <TierBar cart={cart} />
      <Divider />
      <CartTotals />
      <PromotionCode cart={cart} />
      <Divider />
      {belowMin && (
        <p className="rounded-lg bg-oh-paper px-3 py-2 text-[12px] text-oh-graphite">
          Минимальный оптовый заказ — {formatRub(OPT_THRESHOLD)}. Добавьте ещё товаров на {formatRub(OPT_THRESHOLD - (cart.item_subtotal ?? 0))}.
        </p>
      )}
      {limitExceeded && (
        <p className="rounded-lg bg-oh-paper px-3 py-2 text-[12px] text-oh-graphite">
          Заказ превышает лимит расходов вашего сотрудника. Нужна проверка администратором компании.
        </p>
      )}
      {belowMin || limitExceeded ? (
        <button className="oh-btn w-full" disabled data-testid="checkout-button">
          {limitExceeded ? "Превышен лимит" : `Оформить заказ от ${formatRub(OPT_THRESHOLD)}`}
        </button>
      ) : (
        <LocalizedClientLink href={checkoutButtonLink} className="oh-btn w-full" data-testid="checkout-button">
          {customer ? "Оформить заказ" : "Войти и оформить заказ"}
        </LocalizedClientLink>
      )}
      {customer ? (
        <RequestQuoteConfirmation>
          <button className="oh-btn-ghost w-full" disabled={isPendingApproval}>
            Запросить спеццену
          </button>
        </RequestQuoteConfirmation>
      ) : (
        <RequestQuotePrompt>
          <button className="oh-btn-ghost w-full" disabled={isPendingApproval}>
            Запросить спеццену
          </button>
        </RequestQuotePrompt>
      )}
      <CartToCsvButton cart={cart} />
      <button onClick={handleEmptyCart} className="text-[12px] text-oh-muted hover:text-oh-primary" disabled={isPendingApproval}>
        Очистить корзину
      </button>
    </div>
  )
}

export default Summary
