"use client"

import { isStripeLike, paymentInfoMap } from "@/lib/constants"
import { initiatePaymentSession } from "@/lib/data/cart"
import ErrorMessage from "@/modules/checkout/components/error-message"
import StepCard from "@/modules/checkout/components/step-card"
import Button from "@/modules/common/components/button"
import { ApprovalStatusType } from "@/types"
import { clx } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

/** Пояснения к способам оплаты */
const HINTS: Record<string, string> = {
  pp_system_default: "После оформления менеджер выставит счёт на email из реквизитов. Отгружаем после поступления оплаты.",
}

/**
 * Шаг «Оплата». Сейчас способ один — счёт для юрлица, поэтому он выбран заранее;
 * при подключении онлайн-оплаты список станет выбором.
 */
const Payment = ({ cart, availablePaymentMethods }: { cart: any; availablePaymentMethods: any[] }) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find((s: any) => s.status === "pending")
  const methods = [...(availablePaymentMethods || [])].sort((a, b) => (a.provider_id > b.provider_id ? 1 : -1))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>(activeSession?.provider_id ?? (methods.length === 1 ? methods[0].id : ""))
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"
  const pending = cart.approval_status?.status === ApprovalStatusType.PENDING
  const done = !!activeSession && cart?.shipping_methods?.length !== 0
  const locked = !cart.email || !(cart.shipping_methods?.length ?? 0)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      if (!activeSession || activeSession.provider_id !== selected) {
        await initiatePaymentSession(cart, { provider_id: selected })
      }
      router.push(pathname + "?step=review", { scroll: false })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => setError(null), [isOpen])

  return (
    <StepCard
      n={4}
      title="Оплата"
      open={isOpen}
      done={done}
      locked={locked}
      onEdit={!pending && !locked ? () => router.push(pathname + "?step=payment", { scroll: false }) : undefined}
      testId="payment-step"
      summary={activeSession && <div className="font-medium text-oh-ink">{paymentInfoMap[activeSession.provider_id]?.title || activeSession.provider_id}</div>}
    >
      <div className="flex flex-col gap-2" role="radiogroup">
        {methods.map((pm) => {
          const on = selected === pm.id
          return (
            <button
              key={pm.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(pm.id)}
              className={clx("flex items-start gap-3 rounded-lg border p-3 text-left transition-colors", on ? "border-oh-azure bg-oh-azure/5" : "border-oh-line-2 hover:border-oh-azure/60")}
            >
              <span className={clx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-oh-azure" : "border-oh-line-2")}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-oh-azure" />}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-oh-ink">{paymentInfoMap[pm.id]?.title || pm.id}</span>
                {HINTS[pm.id] && <span className="block text-[12.5px] text-oh-muted">{HINTS[pm.id]}</span>}
              </span>
              <span className="shrink-0 text-oh-muted">{paymentInfoMap[pm.id]?.icon}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex flex-col items-end gap-2">
        <ErrorMessage error={error} data-testid="payment-method-error-message" />
        <Button size="large" onClick={handleSubmit} isLoading={isLoading} disabled={!selected || isStripeLike(selected)} data-testid="submit-payment-button">
          Подтвердить способ оплаты
        </Button>
      </div>
    </StepCard>
  )
}

export default Payment
