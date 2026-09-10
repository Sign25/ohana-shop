import type { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { ecAdd } from "@/lib/util/metrika"

export type AddToCartEventPayload = {
  lineItems: {
    productVariant: StoreProductVariant & {
      product: StoreProduct
    }
    quantity: number
  }[]
  regionId: string
}

type CartAddEventHandler = (payload: AddToCartEventPayload) => void

type CartAddEventBus = {
  emitCartAdd: (payload: AddToCartEventPayload) => void
  handler: CartAddEventHandler
  registerCartAddHandler: (handler: CartAddEventHandler) => void
}

/** Шина «добавили в корзину»: оптимистичное обновление корзины (cart-context) + ecommerce «add» для Метрики */
export const addToCartEventBus: CartAddEventBus = {
  emitCartAdd(payload: AddToCartEventPayload) {
    this.handler(payload)
    ecAdd(
      payload.lineItems.map((li) => ({
        id: li.productVariant.product?.id || li.productVariant.product_id || "",
        name: li.productVariant.product?.title || li.productVariant.title || "",
        price: Number((li.productVariant as any).calculated_price?.calculated_amount) || undefined,
        quantity: li.quantity,
        variant: li.productVariant.title || undefined,
      }))
    )
  },

  handler: () => {},

  registerCartAddHandler(handler: CartAddEventHandler) {
    this.handler = handler
  },
}
