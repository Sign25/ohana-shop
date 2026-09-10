"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { visibleShowcases } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type Cat = HttpTypes.StoreProductCategory

/**
 * Кнопка «Каталог» с выпадающей панелью: слева разделы, справа подразделы выбранного.
 * Повторяет панель кнопки «Каталог» текущего сайта (ohana-header-redesign / header-catalog-button).
 */
const CatalogMenu = ({ categories }: { categories: Cat[] }) => {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  const isShowcase = (c: Cat) => (c.metadata as any)?.kind === "showcase"
  const roots = categories.filter((c) => !c.parent_category_id && !isShowcase(c))
  const showcases = visibleShowcases(categories)
  const children = (id: string) => categories.filter((c) => c.parent_category_id === id)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = active || roots[0]?.id

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={clx(
          "inline-flex items-center gap-2 rounded-pill border px-4 py-2.5 text-sm font-medium transition-colors",
          open
            ? "border-oh-azure text-oh-azure bg-white"
            : "border-oh-line-2 text-oh-ink hover:border-oh-azure hover:text-oh-azure"
        )}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        Каталог
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(960px,calc(100vw-48px))] rounded-card border border-oh-line bg-white shadow-[0_18px_50px_rgba(74,74,74,0.14)]">
          <div className="grid grid-cols-[260px_1fr]">
            <ul className="border-r border-oh-line py-3">
              {roots.map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={`/categories/${c.handle}`}
                    onMouseEnter={() => setActive(c.id)}
                    className={clx(
                      "flex items-center justify-between px-5 py-2.5 text-[15px] font-medium",
                      current === c.id ? "bg-oh-paper text-oh-azure" : "text-oh-ink hover:bg-oh-paper"
                    )}
                  >
                    {c.name}
                    <span className="text-oh-muted">›</span>
                  </LocalizedClientLink>
                </li>
              ))}
              {showcases.length > 0 && (
                <li className="mt-2 border-t border-oh-line px-5 pt-3">
                  <div className="mb-1 text-[13px] font-medium text-oh-graphite">Подборки</div>
                  <div className="flex flex-wrap gap-1.5">
                    {showcases.map((c) => (
                      <LocalizedClientLink key={c.id} href={`/categories/${c.handle}`} className="oh-chip !px-2.5 !py-1 !text-[12px]">
                        {c.name}
                      </LocalizedClientLink>
                    ))}
                  </div>
                </li>
              )}
            </ul>
            <div className="p-6">
              {current && (
                <>
                  <LocalizedClientLink
                    href={`/categories/${roots.find((r) => r.id === current)?.handle}`}
                    className="oh-h mb-4 block text-[22px] hover:text-oh-azure"
                  >
                    {roots.find((r) => r.id === current)?.name}
                  </LocalizedClientLink>
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5 medium:grid-cols-3">
                    {children(current).map((s) => (
                      <li key={s.id}>
                        <LocalizedClientLink href={`/categories/${s.handle}`} className="block py-1 text-[14px] text-oh-graphite hover:text-oh-azure">
                          {s.name}
                        </LocalizedClientLink>
                      </li>
                    ))}
                    {children(current).length === 0 && (
                      <li className="text-sm text-oh-muted">Все товары раздела</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatalogMenu
