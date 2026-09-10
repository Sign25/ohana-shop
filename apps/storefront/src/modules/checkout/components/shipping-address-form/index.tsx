import AddressSelect from "@/modules/checkout/components/address-select"
import CountrySelect from "@/modules/checkout/components/country-select"
import Input from "@/modules/common/components/input"
import { B2BCart, B2BCustomer } from "@/types"
import { HttpTypes } from "@medusajs/types"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"

/** Кто получает груз и куда везти. Для ТК достаточно города и терминала — адрес можно указать как «терминал ПЭК». */
const ShippingAddressForm = ({ customer, cart }: { customer: B2BCustomer | null; cart: B2BCart | null }) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": customer?.first_name || "",
    "shipping_address.last_name": customer?.last_name || "",
    "shipping_address.address_1": "",
    "shipping_address.company": cart?.company?.name || "",
    "shipping_address.postal_code": "",
    "shipping_address.city": "",
    "shipping_address.country_code": "ru",
    "shipping_address.province": "",
    "shipping_address.phone": customer?.phone || "",
    email: customer?.email || "",
  })

  const countriesInRegion = useMemo(() => cart?.region?.countries?.map((c) => c.iso_2), [cart?.region])
  const addressesInRegion = useMemo(
    () => customer?.addresses.filter((a) => a.country_code && countriesInRegion?.includes(a.country_code)),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (address?: HttpTypes.StoreCartAddress, email?: string) => {
    address &&
      setFormData((prev: Record<string, any>) => ({
        ...prev,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "ru",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))
    email && setFormData((prev: Record<string, any>) => ({ ...prev, email }))
  }

  useEffect(() => {
    if (cart?.shipping_address?.address_1) setFormAddress(cart.shipping_address)
  }, [cart])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="flex flex-col gap-4">
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-oh-paper p-4">
          <p className="text-[13px] text-oh-graphite">Подставить сохранённый адрес</p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={mapKeys(formData, (_, key) => key.replace("shipping_address.", "")) as HttpTypes.StoreCartAddress}
            onSelect={setFormAddress}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
        <Input label="Имя получателя" name="shipping_address.first_name" autoComplete="given-name" value={formData["shipping_address.first_name"]} onChange={handleChange} required data-testid="shipping-first-name-input" />
        <Input label="Фамилия" name="shipping_address.last_name" autoComplete="family-name" value={formData["shipping_address.last_name"]} onChange={handleChange} required data-testid="shipping-last-name-input" />
        <Input label="Телефон получателя" name="shipping_address.phone" type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" value={formData["shipping_address.phone"]} onChange={handleChange} required data-testid="shipping-phone-input" hint="По нему ТК свяжется при доставке" />
        <Input label="Компания / получатель груза" name="shipping_address.company" value={formData["shipping_address.company"]} onChange={handleChange} autoComplete="organization" data-testid="shipping-company-input" />
        <Input label="Город" name="shipping_address.city" autoComplete="address-level2" value={formData["shipping_address.city"]} onChange={handleChange} required data-testid="shipping-city-input" />
        <Input label="Регион / область" name="shipping_address.province" autoComplete="address-level1" value={formData["shipping_address.province"]} onChange={handleChange} data-testid="shipping-province-input" />
        <Input label="Адрес: улица, дом, офис — или терминал ТК" name="shipping_address.address_1" autoComplete="address-line1" placeholder="например: терминал ПЭК, ул. Ленина, 1" value={formData["shipping_address.address_1"]} onChange={handleChange} required data-testid="shipping-address-input" colSpan={2} />
        <Input label="Индекс" name="shipping_address.postal_code" inputMode="numeric" autoComplete="postal-code" value={formData["shipping_address.postal_code"]} onChange={handleChange} required data-testid="shipping-postal-code-input" />
        <CountrySelect label="Страна" name="shipping_address.country_code" autoComplete="country" region={cart?.region} value={formData["shipping_address.country_code"]} onChange={handleChange} required data-testid="shipping-country-select" />
      </div>
    </div>
  )
}

export default ShippingAddressForm
