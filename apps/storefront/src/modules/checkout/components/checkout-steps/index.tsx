"use client"

import { B2BCart } from "@/types"
import { clx } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export const CHECKOUT_STEPS = [
  { key: "shipping-address", label: "Получатель и адрес" },
  { key: "delivery", label: "Доставка" },
  { key: "contact-details", label: "Реквизиты" },
  { key: "payment", label: "Оплата" },
] as const
export type StepKey = (typeof CHECKOUT_STEPS)[number]["key"]

export const stepDone = (cart: B2BCart, key: StepKey) => {
  switch (key) {
    case "shipping-address": return !!cart.shipping_address?.address_1
    case "delivery": return (cart.shipping_methods?.length ?? 0) > 0
    case "contact-details": return !!cart.email
    case "payment": return !!cart.payment_collection?.payment_sessions?.some((s: any) => s.status === "pending")
  }
}

/** Прогресс оформления: 4 шага, готовые — кликабельны, текущий выделен лазурью */
const CheckoutSteps = ({ cart }: { cart: B2BCart }) => {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const current = (sp.get("step") || "shipping-address") as string
  const currentIdx = Math.max(0, CHECKOUT_STEPS.findIndex((s) => s.key === current))

  return (
    <div className="flex flex-col gap-1">
    <ol className="flex items-center gap-1 small:gap-2" aria-label="Шаги оформления">
      {CHECKOUT_STEPS.map((s, i) => {
        const done = stepDone(cart, s.key)
        const active = i === currentIdx
        const reachable = done || i <= currentIdx
        return (
          <li key={s.key} className="flex min-w-0 flex-1 items-center gap-1 small:gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => router.push(`${pathname}?step=${s.key}`, { scroll: false })}
              className={clx("flex min-w-0 items-center gap-2 rounded-pill py-1 pr-2 text-left", reachable && !active && "hover:text-oh-azure")}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={clx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                  active ? "bg-oh-azure text-white" : done ? "bg-oh-mint-deep text-white" : "border border-oh-line-2 bg-white text-oh-muted"
                )}
              >
                {done && !active ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5L20 7" /></svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={clx("truncate text-[13px]", active ? "font-semibold text-oh-ink" : done ? "text-oh-ink" : "text-oh-muted", "hidden xsmall:inline")}>{s.label}</span>
            </button>
            {i < CHECKOUT_STEPS.length - 1 && <span className={clx("h-px flex-1", i < currentIdx ? "bg-oh-mint-deep" : "bg-oh-line-2")} aria-hidden />}
          </li>
        )
      })}
    </ol>
    {/* на телефоне подписи шагов не помещаются — текущий шаг подписываем отдельной строкой */}
    <div className="text-[13px] font-semibold text-oh-ink xsmall:hidden">
      Шаг {currentIdx + 1} из {CHECKOUT_STEPS.length}: {CHECKOUT_STEPS[currentIdx].label}
    </div>
    </div>
  )
}

export default CheckoutSteps
