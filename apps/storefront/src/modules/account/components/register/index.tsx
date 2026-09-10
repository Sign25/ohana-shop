"use client"

import { signup } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import ErrorMessage from "@/modules/checkout/components/error-message"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import Input from "@/modules/common/components/input"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { Checkbox, Text } from "@medusajs/ui"
import { ChangeEvent, useActionState, useState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  regions: HttpTypes.StoreRegion[]
}

/**
 * Регистрация оптовика — коротко: контакт + компания. Адрес и реквизиты для счёта
 * спрашиваем при оформлении заказа, а не на входе (у покупателя должно быть удобно).
 * Страна и валюта фиксированы: Россия / рубли.
 */
const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const [terms, setTerms] = useState(false)
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", phone: "", company_name: "", company_city: "", password: "" })
  const onChange = (e: ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [e.target.name]: e.target.value }))
  const valid = terms && !!f.email && !!f.first_name && !!f.company_name && f.password.length >= 8

  return (
    <div className="my-8 flex w-full max-w-md flex-col items-start gap-3" data-testid="register-page">
      <div>
        <h1 className="oh-h text-[32px]">Регистрация оптовика</h1>
        <Text className="mt-1 text-[13px] text-oh-graphite">Две минуты. Реквизиты и адрес доставки попросим при первом заказе.</Text>
      </div>
      <form className="flex w-full flex-col" action={formAction}>
        <input type="hidden" name="company_country" value="ru" />
        <input type="hidden" name="currency_code" value="rub" />
        <input type="hidden" name="company_phone" value={f.phone} />
        <div className="grid w-full grid-cols-1 gap-3 small:grid-cols-2">
          <Input label="Имя" name="first_name" required autoComplete="given-name" value={f.first_name} onChange={onChange} data-testid="first-name-input" className="bg-white" />
          <Input label="Фамилия" name="last_name" autoComplete="family-name" value={f.last_name} onChange={onChange} data-testid="last-name-input" className="bg-white" />
          <Input label="Email" name="email" required type="email" autoComplete="email" value={f.email} onChange={onChange} data-testid="email-input" className="bg-white" />
          <Input label="Телефон" name="phone" required type="tel" autoComplete="tel" value={f.phone} onChange={onChange} data-testid="phone-input" className="bg-white" />
          <Input label="Компания или ИП" name="company_name" required autoComplete="organization" value={f.company_name} onChange={onChange} data-testid="company-name-input" className="bg-white small:col-span-2" />
          <Input label="Город" name="company_city" autoComplete="address-level2" value={f.company_city} onChange={onChange} data-testid="company-city-input" className="bg-white" />
          <Input label="Пароль (от 8 символов)" name="password" required type="password" autoComplete="new-password" value={f.password} onChange={onChange} data-testid="password-input" className="bg-white" />
        </div>
        <label className="mt-4 flex items-start gap-2 text-[12px] text-oh-graphite">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} data-testid="terms-checkbox" />
          <span>
            Согласен с{" "}
            <LocalizedClientLink href="/p/privacy-policy" className="underline hover:text-oh-azure">политикой обработки персональных данных</LocalizedClientLink>{" "}
            и условиями оптовых поставок.
          </span>
        </label>
        <ErrorMessage error={message ? "Не удалось зарегистрироваться. Возможно, такой email уже есть — попробуйте войти." : null} data-testid="register-error" />
        <div className="mt-5 flex flex-col gap-2">
          <SubmitButton className="w-full !rounded-pill !bg-oh-primary hover:!bg-oh-primary-hover !border-none !shadow-none" data-testid="register-button" disabled={!valid}>
            Создать кабинет
          </SubmitButton>
          <button type="button" onClick={() => setCurrentView(LOGIN_VIEW.LOG_IN)} className="oh-btn-ghost w-full">
            У меня уже есть кабинет
          </button>
        </div>
      </form>
    </div>
  )
}

export default Register
