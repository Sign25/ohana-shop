"use client"

import { setShippingMethod } from "@/lib/data/cart"
import { formatRub } from "@/lib/util/ohana"
import ErrorMessage from "@/modules/checkout/components/error-message"
import StepCard from "@/modules/checkout/components/step-card"
import Button from "@/modules/common/components/button"
import { ApprovalStatusType, B2BCart } from "@/types"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

/** Пояснения к способам доставки (по названиям из админки) */
const HINTS: [RegExp, string][] = [
  [/терминал/i, "Довезём до терминала выбранной ТК в Омске бесплатно, дальше — по тарифу ТК"],
  [/самовывоз/i, "Склад в Омске, пн–пт 10:00–18:00; заказ соберём к согласованному времени"],
  [/до города|до двери|ТК до/i, "Стоимость доставки ТК до вашего города рассчитает менеджер и добавит в счёт"],
]

const Shipping = ({ cart, availableShippingMethods }: { cart: B2BCart; availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"
  const pending = cart?.approval_status?.status === ApprovalStatusType.PENDING
  const selected = availableShippingMethods?.find((m) => m.id === cart.shipping_methods?.at(-1)?.shipping_option_id)
  const done = !!selected
  const locked = !cart.shipping_address?.address_1

  const set = async (id: string) => {
    setIsLoading(true)
    await setShippingMethod({ cartId: cart.id, shippingMethodId: id }).catch((err) => setError(err.message)).finally(() => setIsLoading(false))
  }
  useEffect(() => setError(null), [isOpen])

  return (
    <StepCard
      n={2}
      title="Способ доставки"
      open={isOpen}
      done={done}
      locked={locked}
      onEdit={!pending && !locked ? () => router.push(pathname + "?step=delivery", { scroll: false }) : undefined}
      testId="delivery-step"
      summary={selected && <div><span className="font-medium text-oh-ink">{selected.name}</span> · {selected.amount ? formatRub(selected.amount) : "бесплатно"}</div>}
    >
      <div className="flex flex-col gap-2" data-testid="delivery-options-container" role="radiogroup">
        {availableShippingMethods?.map((option) => {
          const on = option.id === selected?.id
          const hint = HINTS.find(([re]) => re.test(option.name))?.[1]
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set(option.id)}
              data-testid="delivery-option-radio"
              className={clx(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                on ? "border-oh-azure bg-oh-azure/5" : "border-oh-line-2 hover:border-oh-azure/60"
              )}
            >
              <span className={clx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-oh-azure" : "border-oh-line-2")}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-oh-azure" />}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-oh-ink">{option.name}</span>
                {hint && <span className="block text-[12.5px] text-oh-muted">{hint}</span>}
              </span>
              <span className="shrink-0 text-[14px] text-oh-ink">{option.amount ? formatRub(option.amount) : "0 ₽"}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex flex-col items-end gap-2">
        <ErrorMessage error={error} data-testid="delivery-option-error-message" />
        <Button size="large" onClick={() => router.push(pathname + "?step=contact-details", { scroll: false })} isLoading={isLoading} disabled={!cart.shipping_methods?.[0]} data-testid="submit-delivery-option-button">
          Далее: реквизиты
        </Button>
      </div>
    </StepCard>
  )
}

export default Shipping
