import { login } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import ErrorMessage from "@/modules/checkout/components/error-message"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import Input from "@/modules/common/components/input"
import { Checkbox, Text } from "@medusajs/ui"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div className="my-auto flex h-full w-full max-w-sm flex-col justify-center gap-5" data-testid="login-page">
      <div>
        <h1 className="oh-h text-[32px]">Вход в кабинет</h1>
        <Text className="mt-1 text-[13px] text-oh-graphite">Цены вашей группы, история заказов и повтор заказа в один клик.</Text>
      </div>
      <form className="w-full" action={formAction}>
        <div className="flex w-full flex-col gap-y-2">
          <Input label="Эл. почта" name="email" type="email" title="Введите корректный email" autoComplete="email" required data-testid="email-input" />
          <Input label="Пароль" name="password" type="password" autoComplete="current-password" required data-testid="password-input" />
          <div className="mt-3 flex items-center gap-2">
            <Checkbox name="remember_me" data-testid="remember-me-checkbox" />
            <Text className="text-[13px] text-oh-graphite">Запомнить меня</Text>
          </div>
        </div>
        <ErrorMessage
          error={
            message === "no_account"
              ? "Аккаунта с такой почтой нет. Проверьте адрес или зарегистрируйте компанию — это бесплатно."
              : message === "wrong_password"
              ? "Пароль не подходит. Если забыли — напишите на info@ohanamarket.ru, восстановим вручную."
              : message
              ? "Не удалось войти: проверьте email и пароль"
              : null
          }
          data-testid="login-error-message"
        />
        <div className="mt-5 flex flex-col gap-2">
          <SubmitButton data-testid="sign-in-button" className="w-full !rounded-pill !bg-oh-primary hover:!bg-oh-primary-hover !border-none !shadow-none">
            Войти
          </SubmitButton>
          <button type="button" onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)} className="oh-btn-ghost w-full" data-testid="register-button">
            Зарегистрировать компанию
          </button>
        </div>
      </form>
      <Text className="text-[12px] text-oh-muted">
        Забыли пароль? Напишите на <a href="mailto:info@ohanamarket.ru" className="underline hover:text-oh-azure">info@ohanamarket.ru</a> или позвоните 8 (991) 430-17-30, восстановим вручную.
      </Text>
    </div>
  )
}

export default Login
