import { B2BCart } from "@/types/global"

/** Первый незаполненный шаг оформления: адрес → доставка → реквизиты → оплата (плательщик = адрес доставки, отдельного шага нет) */
export function getCheckoutStep(cart: B2BCart) {
  if (!cart?.shipping_address?.address_1) {
    return "shipping-address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else if (!cart.email) {
    return "contact-details"
  } else if (!cart.payment_collection?.payment_sessions?.find((paymentSession: any) => paymentSession.status === "pending")) {
    return "payment"
  } else {
    return null
  }
}
