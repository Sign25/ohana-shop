"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-card bg-oh-beige px-5 py-4 small:flex-row small:items-center">
      <div>
        <div className="text-[15px] font-semibold text-oh-ink">Войдите, чтобы оформить заказ</div>
        <div className="text-[12px] text-oh-graphite">В кабинете сохраняются реквизиты, адреса и история заказов, а цены вашей группы применяются автоматически.</div>
      </div>
      <div className="flex gap-2">
        <LocalizedClientLink href="/account?view=register" className="oh-btn-ghost" data-testid="sign-in-button">
          Регистрация
        </LocalizedClientLink>
        <LocalizedClientLink href="/account?view=log-in" className="oh-btn" data-testid="sign-in-button">
          Войти
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
