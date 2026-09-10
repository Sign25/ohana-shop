"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { visibleShowcases } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { useState } from "react"

type Cat = HttpTypes.StoreProductCategory

/** Боковое дерево каталога: разделы → подразделы; сезонные подборки отдельным блоком. */
const CategoryList = ({ categories, currentCategory, bare }: { categories: Cat[]; currentCategory?: Cat; bare?: boolean }) => {
  const isShowcase = (c: Cat) => (c.metadata as any)?.kind === "showcase"
  const roots = categories.filter((c) => !c.parent_category_id && !isShowcase(c))
  const showcases = visibleShowcases(categories)
  const children = (id: string) => categories.filter((c) => c.parent_category_id === id)

  const activeRoot = currentCategory
    ? currentCategory.parent_category_id || currentCategory.id
    : null
  const [expanded, setExpanded] = useState<string[]>(activeRoot ? [activeRoot] : [])
  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className={bare ? "" : "oh-card"}>
      <div className={clx("flex items-center justify-between border-b border-oh-line px-4 py-3", bare && "hidden")}>
        <span className="text-sm font-semibold text-oh-ink">Каталог</span>
        {currentCategory && (
          <LocalizedClientLink href="/store" className="text-xs text-oh-muted hover:text-oh-azure">
            все товары
          </LocalizedClientLink>
        )}
      </div>
      <ul className="py-2 text-sm">
        {roots.map((root) => {
          const kids = children(root.id)
          const isOpen = expanded.includes(root.id)
          const isActive = currentCategory?.id === root.id
          return (
            <li key={root.id}>
              <div className="flex items-center">
                <LocalizedClientLink
                  href={`/categories/${root.handle}`}
                  className={clx("flex-1 px-4 py-2 font-medium hover:text-oh-azure", isActive ? "text-oh-azure" : "text-oh-ink")}
                >
                  {root.name}
                </LocalizedClientLink>
                {kids.length > 0 && (
                  <button type="button" onClick={() => toggle(root.id)} aria-label={isOpen ? "Свернуть" : "Развернуть"} className="px-3 py-2 text-oh-muted hover:text-oh-azure">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={clx("transition-transform", isOpen && "rotate-180")} aria-hidden>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              {kids.length > 0 && isOpen && (
                <ul className="mb-1">
                  {kids.map((k) => (
                    <li key={k.id}>
                      <LocalizedClientLink
                        href={`/categories/${k.handle}`}
                        className={clx("block py-1.5 pl-7 pr-4 hover:text-oh-azure", currentCategory?.id === k.id ? "font-medium text-oh-azure" : "text-oh-graphite")}
                      >
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
        <div className="border-t border-oh-line px-4 py-3">
          <div className="mb-2 text-[13px] font-medium text-oh-graphite">Подборки</div>
          <div className="flex flex-wrap gap-1.5">
            {showcases.map((c) => (
              <LocalizedClientLink
                key={c.id}
                href={`/categories/${c.handle}`}
                className={clx("oh-chip !px-2.5 !py-1 !text-[12px]", currentCategory?.id === c.id && "!border-oh-azure !text-oh-azure")}
              >
                {c.name}
              </LocalizedClientLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryList
