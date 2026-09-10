import Input from "@/modules/common/components/input"
import { B2BCart, B2BCustomer } from "@/types"
import React, { useEffect, useState } from "react"

/**
 * Реквизиты для счёта и контакты. Оптовик платит по счёту, поэтому просим юрлицо/ИП и ИНН;
 * КПП и юридический адрес — по желанию (для ООО нужны в счёте). Всё уходит в metadata корзины → заказа.
 */
const ContactDetailsForm = ({ customer, cart }: { customer: B2BCustomer | null; cart: B2BCart | null }) => {
  const m = (k: string) => cart?.metadata?.[k]?.toString() || ""
  const [formData, setFormData] = useState<Record<string, string>>({
    email: cart?.email || customer?.email || "",
    invoice_recipient: m("invoice_recipient") || cart?.company?.name || "",
    cost_center: m("cost_center"),
    kpp: m("kpp"),
    legal_address: m("legal_address"),
    contact_phone: m("contact_phone") || customer?.phone || cart?.shipping_address?.phone || "",
    requisition_number: m("requisition_number"),
    door_code: m("door_code"),
    notes: m("notes"),
  })

  useEffect(() => {
    if (cart?.email) setFormData((prev) => ({ ...prev, email: cart.email || prev.email }))
  }, [cart?.email])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
        <Input label="Юридическое лицо или ИП (как в счёте)" name="invoice_recipient" autoComplete="organization" value={formData.invoice_recipient} onChange={handleChange} required data-testid="invoice-recipient-input" colSpan={2} />
        <Input label="ИНН" name="cost_center" inputMode="numeric" pattern="\d{10}|\d{12}" title="10 цифр для организации, 12 для ИП" value={formData.cost_center} onChange={handleChange} required data-testid="cost-center-input" hint="10 цифр у организации, 12 у ИП" />
        <Input label="КПП" name="kpp" inputMode="numeric" value={formData.kpp} onChange={handleChange} data-testid="kpp-input" hint="Только для организаций" />
        <Input label="Юридический адрес" name="legal_address" value={formData.legal_address} onChange={handleChange} data-testid="legal-address-input" colSpan={2} />
      </div>
      <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
        <Input label="Email для счёта и уведомлений" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required data-testid="email-input" />
        <Input label="Телефон для связи по заказу" name="contact_phone" type="tel" autoComplete="tel" value={formData.contact_phone} onChange={handleChange} data-testid="contact-phone-input" />
        <Input label="Номер вашей заявки" name="requisition_number" value={formData.requisition_number} onChange={handleChange} data-testid="requisition-number-input" hint="Если ведёте свой учёт заказов" />
        <Input label="Отметка на грузе / для ТК" name="door_code" value={formData.door_code} onChange={handleChange} data-testid="door-code-input" hint="Например, название магазина на коробках" />
        <div className="col-span-1 flex flex-col gap-1 xsmall:col-span-2">
          <label htmlFor="f-notes" className="text-[13px] text-oh-graphite">Комментарий к заказу</label>
          <textarea id="f-notes" name="notes" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="notes-input" className="w-full rounded-lg border border-oh-line-2 px-3 py-2 text-[15px] text-oh-ink focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15" />
          <div className="text-[12px] text-oh-muted">Комментарий увидит менеджер при сборке заказа.</div>
        </div>
      </div>
    </div>
  )
}

export default ContactDetailsForm
