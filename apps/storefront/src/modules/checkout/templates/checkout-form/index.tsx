import { listCartShippingMethods } from "@/lib/data/fulfillment"
import { listCartPaymentMethods } from "@/lib/data/payment"
import ApprovalStatusBanner from "@/modules/cart/components/approval-status-banner"
import SignInPrompt from "@/modules/cart/components/sign-in-prompt"
import CheckoutSteps from "@/modules/checkout/components/checkout-steps"
import ContactDetails from "@/modules/checkout/components/contact-details"
import Payment from "@/modules/checkout/components/payment"
import Shipping from "@/modules/checkout/components/shipping"
import ShippingAddress from "@/modules/checkout/components/shipping-address"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { ApprovalStatusType, B2BCart, B2BCustomer } from "@/types"

/**
 * Шаги оформления оптового заказа: получатель и адрес → доставка → реквизиты для счёта → оплата.
 * Отдельного шага «плательщик» нет: адрес плательщика = адрес доставки, реквизиты юрлица — на шаге 3.
 */
export default async function CheckoutForm({ cart, customer }: { cart: B2BCart | null; customer: B2BCustomer | null }) {
  if (!cart) return null

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
  const requiresApproval = cart.company?.approval_settings?.requires_admin_approval || cart.company?.approval_settings?.requires_sales_manager_approval

  if (!shippingMethods || !paymentMethods) return null

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="oh-h text-[26px] text-oh-ink">Оформление заказа</h1>
        <LocalizedClientLink href="/cart" className="text-[13px] text-oh-muted hover:text-oh-azure">
          ← в корзину
        </LocalizedClientLink>
      </div>
      <div className="oh-card px-4 py-3">
        <CheckoutSteps cart={cart} />
      </div>

      {!customer ? <SignInPrompt checkout /> : null}
      {cart.approval_status && cart.approval_status.status !== ApprovalStatusType.APPROVED && <ApprovalStatusBanner cart={cart} />}

      <ShippingAddress cart={cart} customer={customer} />
      <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      <ContactDetails cart={cart} customer={customer} />
      {(customer?.employee?.is_admin && cart.approval_status?.status === ApprovalStatusType.APPROVED) || !requiresApproval ? (
        <Payment cart={cart} availablePaymentMethods={paymentMethods} />
      ) : null}
    </div>
  )
}
