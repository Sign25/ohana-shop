"use client"

import Login from "@/modules/account/components/login"
import Register from "@/modules/account/components/register"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export enum LOGIN_VIEW {
  LOG_IN = "log-in",
  REGISTER = "register",
}

const BENEFITS = [
  ["Цены от производителя", "Опт от 35 000 ₽, крупный опт от 100 000 ₽ применяется автоматически."],
  ["Заказ размерным рядом", "Таблица размеров с остатками, количество кратно упаковке."],
  ["Отгрузка 24–48 часов", "Со склада в Омске, до терминала любой ТК бесплатно."],
  ["Документы для маркетплейсов", "Сертификаты, маркировка, разрешительное письмо на ТМ."],
]

const LoginTemplate = ({ regions }: { regions: HttpTypes.StoreRegion[] }) => {
  const route = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(() => {
    const v = searchParams.get("view") as LOGIN_VIEW
    return v && Object.values(LOGIN_VIEW).includes(v) ? v : LOGIN_VIEW.LOG_IN
  })

  useEffect(() => {
    if (searchParams.has("view")) {
      const p = new URLSearchParams(searchParams)
      p.delete("view")
      router.replace(`${route}${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false })
    }
  }, [searchParams, route, router])

  const updateView = (view: LOGIN_VIEW) => {
    setCurrentView(view)
    router.push(`/account?view=${view}`)
  }

  return (
    <div className="bg-oh-paper/60">
      <div className="content-container grid min-h-[70vh] grid-cols-1 gap-6 py-10 small:grid-cols-[minmax(0,1fr)_420px]">
        <div className="oh-card flex items-center justify-center p-6 small:p-12">
          {currentView === LOGIN_VIEW.LOG_IN ? <Login setCurrentView={updateView} /> : <Register setCurrentView={updateView} regions={regions} />}
        </div>
        <aside className="hidden flex-col justify-center gap-5 rounded-card bg-oh-beige p-8 small:flex">
          <div className="oh-h text-[26px]">Кабинет оптовика Ohana</div>
          <ul className="flex flex-col gap-4">
            {BENEFITS.map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-oh-primary" />
                <div>
                  <div className="text-[14px] font-semibold text-oh-ink">{t}</div>
                  <div className="text-[12.5px] text-oh-graphite">{d}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="text-[12px] text-oh-muted">Вопросы по регистрации: 8 (991) 430-17-30, пн–пт 10:00–18:00 (Омск)</div>
        </aside>
      </div>
    </div>
  )
}

export default LoginTemplate
