"use client"

import { audienceLabel, visibleShowcases } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type Cat = HttpTypes.StoreProductCategory

/** Мобильное меню: кнопка-бургер в шапке, выезжающая панель с разделами (аккордеон), подборками и контактами */
const MobileMenu = ({ categories }: { categories: Cat[] }) => {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const pathname = usePathname()
  const isShowcase = (c: Cat) => (c.metadata as any)?.kind === "showcase"
  const roots = categories.filter((c) => !c.parent_category_id && !isShowcase(c))
  const showcases = visibleShowcases(categories)
  const children = (id: string) => categories.filter((c) => c.parent_category_id === id)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <div className="small:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Меню" className="flex h-10 w-10 items-center justify-center rounded-full text-oh-ink hover:bg-oh-paper">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-oh-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-oh-line px-4 py-3">
              <span className="oh-h text-[20px]">Каталог</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="h-9 w-9 rounded-full text-oh-graphite hover:bg-oh-paper">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="py-1">
                {roots.map((c) => {
                  const kids = children(c.id)
                  const isOpen = expanded === c.id
                  return (
                    <li key={c.id} className="border-b border-oh-line/70">
                      <div className="flex items-center">
                        <LocalizedClientLink href={`/categories/${c.handle}`} className="flex-1 px-4 py-3 text-[15px] font-medium text-oh-ink">
                          {audienceLabel(c.name)}
                        </LocalizedClientLink>
                        {kids.length > 0 && (
                          <button type="button" onClick={() => setExpanded(isOpen ? null : c.id)} aria-label={isOpen ? "Свернуть" : "Развернуть"} className="px-4 py-3 text-oh-muted">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={clx("transition-transform", isOpen && "rotate-180")}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                        )}
                      </div>
                      {isOpen && (
                        <ul className="bg-oh-paper/70 pb-2">
                          {kids.map((k) => (
                            <li key={k.id}>
                              <LocalizedClientLink href={`/categories/${k.handle}`} className="block py-2 pl-7 pr-4 text-[14px] text-oh-graphite">
                                {k.name}
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
              {showcases.length > 0 && (
                <div className="px-4 py-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-oh-muted">Подборки</div>
                  <div className="flex flex-wrap gap-1.5">
                    <LocalizedClientLink href="/store" className="oh-chip !py-1 !text-[12px]">Новинки</LocalizedClientLink>
                    {showcases.map((c) => (
                      <LocalizedClientLink key={c.id} href={`/categories/${c.handle}`} className="oh-chip !py-1 !text-[12px]">{c.name}</LocalizedClientLink>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-oh-line px-4 py-3 text-[13px]">
                <LocalizedClientLink href="/account" className="block py-1.5 text-oh-ink">Личный кабинет</LocalizedClientLink>
                <LocalizedClientLink href="/cart" className="block py-1.5 text-oh-ink">Корзина</LocalizedClientLink>
                <a href="https://ohanaopt.ru/biznes-s-ohanoy/" className="block py-1.5 text-oh-graphite">Бизнес с Оханой</a>
                <a href="https://ohanaopt.ru/podbor-razmera/" className="block py-1.5 text-oh-graphite">Подбор размера</a>
                <a href="https://ohana.market/" className="block py-1.5 text-oh-muted">Розничный магазин ↗</a>
              </div>
            </div>
            <div className="border-t border-oh-line px-4 py-3 text-[13px]">
              <a href="tel:+79914301730" className="font-semibold text-oh-ink">8 (991) 430-17-30</a>
              <div className="text-oh-muted">пн–пт 10:00–18:00, Омск</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileMenu
