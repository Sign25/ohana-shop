"use client"

import { setContactDetails } from "@/lib/data/cart"
import StepCard from "@/modules/checkout/components/step-card"
import { ApprovalStatusType, B2BCart, B2BCustomer } from "@/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import ContactDetailsForm from "../contact-details-form"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

const ContactDetails = ({ cart, customer }: { cart: B2BCart | null; customer: B2BCustomer | null }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [message, formAction] = useActionState(setContactDetails, null)

  if (!cart) return null

  const isOpen = searchParams.get("step") === "contact-details"
  const done = !!cart.email && !!cart.metadata?.invoice_recipient
  const locked = !cart.shipping_address?.address_1 || !(cart.shipping_methods?.length ?? 0)
  const requiresApproval = cart.company?.approval_settings?.requires_admin_approval || cart.company?.approval_settings?.requires_sales_manager_approval
  const pending = cart?.approval_status?.status === ApprovalStatusType.PENDING
  const customerIsAdmin = customer?.employee?.is_admin || false
  const toReview = requiresApproval && (!customerIsAdmin || cart.approval_status?.status !== ApprovalStatusType.APPROVED)

  const handleSubmit = (formData: FormData) => {
    formAction(formData)
    router.push(pathname + "?step=" + (toReview ? "review" : "payment"), { scroll: false })
  }
  const m = (k: string) => cart.metadata?.[k]?.toString() || ""

  return (
    <StepCard
      n={3}
      title="Реквизиты и контакты"
      open={isOpen}
      done={done}
      locked={locked}
      onEdit={!pending && !locked ? () => router.push(pathname + "?step=contact-details", { scroll: false }) : undefined}
      testId="contact-details-step"
      summary={
        <div className="flex flex-col gap-0.5" data-testid="contact-details-summary">
          <div className="font-medium text-oh-ink">{m("invoice_recipient")}{m("cost_center") && ` · ИНН ${m("cost_center")}`}{m("kpp") && ` · КПП ${m("kpp")}`}</div>
          <div>{[cart.email, m("contact_phone")].filter(Boolean).join(" · ")}</div>
          {m("notes") && <div className="text-oh-muted">Комментарий: {m("notes")}</div>}
        </div>
      }
    >
      <form action={handleSubmit}>
        <ContactDetailsForm customer={customer} cart={cart} />
        <div className="mt-5 flex flex-col items-end gap-2">
          <SubmitButton data-testid="submit-contact-details-button">{toReview ? "К проверке заказа" : "Далее: оплата"}</SubmitButton>
          <ErrorMessage error={message} data-testid="contact-details-error-message" />
        </div>
      </form>
    </StepCard>
  )
}

export default ContactDetails
