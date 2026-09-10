import Input from "@/modules/common/components/input"
import { B2BCart, B2BCustomer } from "@/types"
import React, { useEffect, useState } from "react"

/** Реквизиты для счёта и комментарий: оптовик платит по счёту, поэтому просим юрлицо и ИНН */
const ContactDetailsForm = ({ customer, cart }: { customer: B2BCustomer | null; cart: B2BCart | null }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    email: "",
    invoice_recipient: "",
    cost_center: "",
    requisition_number: "",
    door_code: "",
    notes: "",
  })

  useEffect(() => {
    if (cart && cart.email) {
      setFormData((prev) => ({
        ...prev,
        email: cart.email || "",
        invoice_recipient: cart.metadata?.invoice_recipient?.toString() || cart.company?.name || "",
        cost_center: cart.metadata?.cost_center?.toString() || "",
        requisition_number: cart.metadata?.requisition_number?.toString() || "",
        door_code: cart.metadata?.door_code?.toString() || "",
        notes: cart.metadata?.notes?.toString() || "",
      }))
    }
  }, [cart])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="flex flex-col gap-4 small:grid small:grid-cols-2">
      <Input label="Email для счёта и уведомлений" name="email" autoComplete="email" value={formData["email"]} onChange={handleChange} required data-testid="email-input" className="small:col-span-2" />
      <Input label="Юридическое лицо / ИП для счёта" name="invoice_recipient" autoComplete="organization" value={formData["invoice_recipient"]} onChange={handleChange} data-testid="invoice-recipient-input" />
      <Input label="ИНН" name="cost_center" value={formData["cost_center"]} onChange={handleChange} data-testid="cost-center-input" />
      <Input label="Номер вашей заявки (если есть)" name="requisition_number" value={formData["requisition_number"]} onChange={handleChange} data-testid="requisition-number-input" />
      <Input label="Отметка на грузе / для ТК" name="door_code" value={formData["door_code"]} onChange={handleChange} data-testid="door-code-input" />
      <div className="col-span-2">
        <Input label="Комментарий к заказу" name="notes" value={formData["notes"]} onChange={handleChange} data-testid="notes-input" className="small:col-span-2" />
        <label className="text-xs text-oh-muted">Комментарий увидит менеджер при сборке заказа.</label>
      </div>
    </div>
  )
}

export default ContactDetailsForm
