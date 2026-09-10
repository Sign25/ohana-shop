/**
 * Яндекс.Метрика: ecommerce-разметка через dataLayer (как на старом сайте, счётчик с ecommerce:"dataLayer")
 * и цели. Без NEXT_PUBLIC_METRIKA_ID счётчик не подключается, но dataLayer заполняется — безопасно на стенде.
 */
export const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID || ""

type EcProduct = { id: string; name: string; price?: number; quantity?: number; category?: string; variant?: string }

declare global {
  interface Window { dataLayer?: any[]; ym?: (...args: any[]) => void }
}

const push = (obj: any) => {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(obj)
}

export const ecDetail = (p: EcProduct) => push({ ecommerce: { currencyCode: "RUB", detail: { products: [p] } } })
export const ecAdd = (products: EcProduct[]) => products.length && push({ ecommerce: { currencyCode: "RUB", add: { products } } })
export const ecRemove = (products: EcProduct[]) => products.length && push({ ecommerce: { currencyCode: "RUB", remove: { products } } })
export const ecPurchase = (orderId: string, products: EcProduct[], revenue?: number) =>
  push({ ecommerce: { currencyCode: "RUB", purchase: { actionField: { id: orderId, revenue }, products } } })

/** Цель счётчика (sizefinder_used, bizcalc_add_to_cart …) */
export const reachGoal = (goal: string, params?: Record<string, any>) => {
  if (typeof window === "undefined" || !METRIKA_ID || typeof window.ym !== "function") return
  try { window.ym(Number(METRIKA_ID), "reachGoal", goal, params || {}) } catch {}
}

/** Товар из позиции корзины/заказа → формат ecommerce */
export const ecFromLine = (item: { product_id?: string | null; product_title?: string | null; title?: string | null; unit_price?: number | null; quantity?: number; variant_title?: string | null }): EcProduct => ({
  id: String(item.product_id || ""),
  name: String(item.product_title || item.title || ""),
  price: Number(item.unit_price) || undefined,
  quantity: item.quantity,
  variant: item.variant_title || undefined,
})
