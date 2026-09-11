"use client"

import { signout } from "@/lib/data/customer"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { PRICE_LIST_URL } from "@/lib/util/marketplaces"
import { B2BCustomer } from "@/types/global"
import { clx } from "@medusajs/ui"
import { useParams, usePathname } from "next/navigation"

/** Меню кабинета: заказы первыми — это то, зачем оптовик заходит чаще всего */
const AccountNav = ({ customer, numPendingApprovals }: { customer: B2BCustomer | null; numPendingApprovals: number }) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const handleLogout = async () => {
    await signout(countryCode, customer?.id as string)
  }
  const items = [
    { href: "/account", label: "Обзор", exact: true },
    { href: "/account/orders", label: "Заказы" },
    { href: "/account/quotes", label: "Запросы цены" },
    ...(customer?.employee?.is_admin ? [{ href: "/account/approvals", label: "Согласования", badge: numPendingApprovals }] : []),
    { href: "/account/company", label: "Компания и сотрудники" },
    { href: "/account/addresses", label: "Адреса доставки" },
    { href: "/account/profile", label: "Профиль" },
  ] as { href: string; label: string; exact?: boolean; badge?: number }[]
  const tools = [
    { href: "/bystryy-zakaz", label: "Быстрый заказ" },
    { href: PRICE_LIST_URL, label: "Прайс-лист (Excel)" },
    { href: "/biznes-s-ohanoy", label: "Бизнес-калькулятор" },
    { href: "/podbor-razmera", label: "Подбор размера" },
  ]

  const isActive = (href: string, exact?: boolean) => {
    const full = `/${countryCode}${href}`
    return exact ? route === full : route.startsWith(full)
  }

  return (
    <nav className="oh-card p-2" data-testid="account-nav">
      <div className="px-3 py-2 text-[12px] text-oh-muted">
        {customer?.first_name} {customer?.last_name}
        <div className="truncate">{customer?.email}</div>
      </div>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li key={it.href}>
            <LocalizedClientLink
              href={it.href}
              className={clx("flex items-center justify-between rounded-lg px-3 py-2 text-[14px]", isActive(it.href, it.exact) ? "bg-oh-paper font-medium text-oh-azure" : "text-oh-ink hover:bg-oh-paper")}
            >
              {it.label}
              {!!it.badge && <span className="rounded-pill bg-oh-primary px-1.5 text-[12px] text-white">{it.badge}</span>}
            </LocalizedClientLink>
          </li>
        ))}
        <li className="mt-1 border-t border-oh-line pt-1 px-3 pb-1 pt-2 text-[11.5px] uppercase tracking-wide text-oh-muted">Инструменты</li>
        {tools.map((t) => (
          <li key={t.href}>
            {t.href.startsWith("/") ? (
              <LocalizedClientLink href={t.href} className={clx("block rounded-lg px-3 py-2 text-[14px]", isActive(t.href) ? "bg-oh-paper font-medium text-oh-azure" : "text-oh-ink hover:bg-oh-paper")}>{t.label}</LocalizedClientLink>
            ) : (
              <a href={t.href} className="block rounded-lg px-3 py-2 text-[14px] text-oh-ink hover:bg-oh-paper">{t.label}</a>
            )}
          </li>
        ))}
        <li className="mt-1 border-t border-oh-line pt-1">
          <button type="button" onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-[14px] text-oh-muted hover:bg-oh-paper hover:text-oh-primary" data-testid="logout-button">
            Выйти
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default AccountNav
