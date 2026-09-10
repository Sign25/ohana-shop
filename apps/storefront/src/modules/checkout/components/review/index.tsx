"use client"

import { checkSpendingLimit } from "@/lib/util/check-spending-limit"
import { formatRub, OPT_THRESHOLD } from "@/lib/util/ohana"
import PaymentButton from "@/modules/checkout/components/payment-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { B2BCart, B2BCustomer } from "@/types"

const Review = ({ cart, customer }: { cart: B2BCart; customer: B2BCustomer | null }) => {
  const spendLimitExceeded = customer ? checkSpendingLimit(cart, customer) : false
  const belowMin = (cart.item_subtotal ?? 0) < OPT_THRESHOLD

  return (
    <div className="flex flex-col gap-y-3">
      <p className="text-[11px] leading-relaxed text-oh-muted">
        Нажимая «Оформить заказ», вы соглашаетесь с{" "}
        <LocalizedClientLink href="/p/conditions" className="underline hover:text-oh-azure">условиями оптовых поставок</LocalizedClientLink>{" "}
        и{" "}
        <LocalizedClientLink href="/p/privacy-policy" className="underline hover:text-oh-azure">политикой обработки персональных данных</LocalizedClientLink>.
        Заказ берётся в работу после оплаты счёта.
      </p>
      {belowMin ? (
        <>
          <p className="rounded-lg bg-oh-paper px-3 py-2 text-[12px] text-oh-graphite">
            Минимальный оптовый заказ — {formatRub(OPT_THRESHOLD)}. Сейчас в корзине {formatRub(cart.item_subtotal ?? 0)}.
          </p>
          <button className="oh-btn w-full" disabled>Оформить заказ</button>
        </>
      ) : spendLimitExceeded ? (
        <>
          <p className="rounded-lg bg-oh-paper px-3 py-2 text-[12px] text-oh-graphite">
            Заказ превышает лимит расходов вашего сотрудника. Нужна проверка администратором компании.
          </p>
          <button className="oh-btn w-full" disabled>Оформить заказ</button>
        </>
      ) : (
        <PaymentButton cart={cart} data-testid="submit-order-button" />
      )}
    </div>
  )
}

export default Review
