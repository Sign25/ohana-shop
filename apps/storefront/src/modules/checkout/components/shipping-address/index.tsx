"use client"

import { setShippingAddress } from "@/lib/data/cart"
import ErrorMessage from "@/modules/checkout/components/error-message"
import ShippingAddressForm from "@/modules/checkout/components/shipping-address-form"
import StepCard from "@/modules/checkout/components/step-card"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import { B2BCart, B2BCustomer } from "@/types"
import { ApprovalStatusType } from "@/types/approval"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const ShippingAddress = ({ cart, customer }: { cart: B2BCart | null; customer: B2BCustomer | null }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [error, setError] = useState<string | null>(null)

  const step = searchParams.get("step") || "shipping-address"
  const isOpen = step === "shipping-address"
  const a = cart?.shipping_address
  const done = !!a?.address_1
  const pending = cart?.approval_status?.status === ApprovalStatusType.PENDING

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    try {
      await setShippingAddress(formData)
      router.push(pathname + "?step=delivery", { scroll: false })
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <StepCard
      n={1}
      title="Получатель и адрес доставки"
      open={isOpen}
      done={done}
      onEdit={!pending ? () => router.push(pathname + "?step=shipping-address", { scroll: false }) : undefined}
      testId="shipping-address-step"
      summary={
        a && (
          <div className="flex flex-col gap-0.5" data-testid="shipping-address-summary">
            <div className="font-medium text-oh-ink">
              {[a.company, [a.first_name, a.last_name].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
            </div>
            <div>{[a.postal_code, a.city, a.province, a.address_1].filter(Boolean).join(", ")}</div>
            {a.phone && <div className="text-oh-muted">{a.phone}</div>}
          </div>
        )
      }
    >
      <form action={handleSubmit}>
        <ShippingAddressForm customer={customer} cart={cart} />
        <div className="mt-5 flex flex-col items-end gap-2">
          <SubmitButton data-testid="submit-address-button">Далее: доставка</SubmitButton>
          <ErrorMessage error={error} data-testid="address-error-message" />
        </div>
      </form>
    </StepCard>
  )
}

export default ShippingAddress
