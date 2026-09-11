import InteractiveLink from "@/modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Что-то пошло не так",
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Страница не найдена</h1>
      <p className="text-small-regular text-ui-fg-base">
        The cart you tried to access does not exist. Clear your cookies and try
        again.
      </p>
      <InteractiveLink href="/">На главную</InteractiveLink>
    </div>
  )
}
