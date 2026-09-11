"use client"

import { CatalogFacets, CatalogFilters } from "@/lib/data/catalog"
import { formatRub } from "@/lib/util/ohana"
import { clx } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Панель фильтров над списком товаров: размеры (чипы, несколько сразу), цена от–до,
 * наличие (все / есть в наличии / полный размерный ряд). Состояние — в адресе страницы,
 * чтобы фильтр можно было переслать коллеге. Выбор — лазурью (терракот только у CTA).
 */
const CatalogFiltersBar = ({ facets, filters }: { facets: CatalogFacets; filters: CatalogFilters }) => {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pmin, setPmin] = useState(filters.pmin ? String(filters.pmin) : "")
  const [pmax, setPmax] = useState(filters.pmax ? String(filters.pmax) : "")
  const [showAll, setShowAll] = useState(false)
  useEffect(() => { setPmin(filters.pmin ? String(filters.pmin) : ""); setPmax(filters.pmax ? String(filters.pmax) : "") }, [filters.pmin, filters.pmax])

  const push = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) v ? params.set(k, v) : params.delete(k)
    params.delete("page")
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const selected = new Set(filters.size || [])
  const toggleSize = (k: string) => { const next = new Set(selected); next.has(k) ? next.delete(k) : next.add(k); push({ size: [...next].join(",") }) }
  const applyPrice = () => push({ pmin: Number(pmin) > 0 ? String(Number(pmin)) : "", pmax: Number(pmax) > 0 ? String(Number(pmax)) : "" })
  const active = selected.size > 0 || !!filters.pmin || !!filters.pmax || filters.stock !== "any" || !!filters.sale || !!filters.new || !!filters.hits
  const reset = () => push({ size: "", pmin: "", pmax: "", stock: "", sale: "", new: "", hits: "" })

  const LIMIT = 18
  const sizes = showAll ? facets.sizes : facets.sizes.slice(0, LIMIT)
  const sizeLabel = (k: string) => (/^[a-z0-9]+$/.test(k) && /[a-z]/.test(k) ? k.toUpperCase() : k)
  // в адресе: по умолчанию (без stock) — в наличии; stock=full — полный ряд; stock=all — все, включая распроданные
  const stockOptions: { value: "any" | "full" | ""; param: string; label: string; count?: number }[] = [
    { value: "any", param: "", label: "В наличии", count: facets.in_stock },
    { value: "full", param: "full", label: "Полный ряд", count: facets.full_row },
    { value: "", param: "all", label: "Все" },
  ]
  const tags: { key: "hits" | "sale" | "new"; label: string; count: number; on: boolean }[] = [
    { key: "hits", label: "Хиты", count: facets.hits, on: !!filters.hits },
    { key: "sale", label: "Акция", count: facets.sale, on: !!filters.sale },
    { key: "new", label: "Новинки", count: facets.new, on: !!filters.new },
  ].filter((t) => t.count > 0 || t.on)

  return (
    <div className="oh-card mb-3 flex flex-col gap-3 p-3" data-testid="catalog-filters">
      {facets.sizes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] text-oh-muted">Размер</span>
          {sizes.map((s) => {
            const on = selected.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSize(s.key)}
                aria-pressed={on}
                title={`${s.count} товаров с размером ${sizeLabel(s.key)} в наличии`}
                className={clx(
                  "h-9 min-w-[44px] whitespace-nowrap rounded-pill border px-3 text-[13px] font-medium transition-colors",
                  on ? "border-oh-azure bg-oh-azure text-white" : "border-oh-line-2 bg-white text-oh-ink hover:border-oh-azure hover:text-oh-azure"
                )}
              >
                {sizeLabel(s.key)}
              </button>
            )
          })}
          {facets.sizes.length > LIMIT && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="h-9 px-2 text-[13px] text-oh-azure hover:underline">
              {showAll ? "Свернуть" : `Ещё ${facets.sizes.length - LIMIT}`}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-oh-muted">Цена, ₽</span>
          <input
            inputMode="numeric"
            placeholder={facets.price_min ? String(Math.floor(facets.price_min)) : "от"}
            value={pmin}
            onChange={(e) => setPmin(e.target.value.replace(/\D/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Цена от"
            className="h-9 w-[76px] rounded-lg border border-oh-line-2 px-2 text-[13px] text-oh-ink focus:border-oh-azure focus:outline-none"
          />
          <span className="text-oh-muted">–</span>
          <input
            inputMode="numeric"
            placeholder={facets.price_max ? String(Math.ceil(facets.price_max)) : "до"}
            value={pmax}
            onChange={(e) => setPmax(e.target.value.replace(/\D/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Цена до"
            className="h-9 w-[76px] rounded-lg border border-oh-line-2 px-2 text-[13px] text-oh-ink focus:border-oh-azure focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Наличие">
          <span className="text-[13px] text-oh-muted">Наличие</span>
          {stockOptions.map((o) => {
            const on = (filters.stock ?? "any") === o.value
            return (
              <button
                key={o.param || "any"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => push({ stock: o.param })}
                className={clx(
                  "h-9 whitespace-nowrap rounded-pill border px-3 text-[13px] font-medium transition-colors",
                  on ? "border-oh-azure bg-oh-azure text-white" : "border-oh-line-2 bg-white text-oh-ink hover:border-oh-azure hover:text-oh-azure"
                )}
              >
                {o.label}
                {typeof o.count === "number" && <span className={clx("ml-1 text-[12px]", on ? "text-white/80" : "text-oh-muted")}>{o.count}</span>}
              </button>
            )
          })}
        </div>
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5">
            {tags.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={t.on}
                onClick={() => push({ [t.key]: t.on ? "" : "1" })}
                className={clx(
                  "h-9 whitespace-nowrap rounded-pill border px-3 text-[13px] font-medium transition-colors",
                  t.on ? (t.key === "sale" ? "border-oh-primary bg-oh-primary text-white" : t.key === "hits" ? "border-[#E69C4E] bg-[#E69C4E] text-white" : "border-oh-mint-deep bg-oh-mint-deep text-white") : "border-oh-line-2 bg-white text-oh-ink hover:border-oh-azure hover:text-oh-azure"
                )}
              >
                {t.label}
                <span className={clx("ml-1 text-[12px]", t.on ? "text-white/80" : "text-oh-muted")}>{t.count}</span>
              </button>
            ))}
          </div>
        )}
        {active && (
          <button type="button" onClick={reset} className="ml-auto h-9 text-[13px] text-oh-primary hover:underline">
            Сбросить фильтры
          </button>
        )}
      </div>
      {active && (filters.pmin || filters.pmax) ? (
        <div className="text-[12px] text-oh-muted">
          Цена {filters.pmin ? `от ${formatRub(filters.pmin)}` : ""} {filters.pmax ? `до ${formatRub(filters.pmax)}` : ""} — по оптовой цене за штуку
        </div>
      ) : null}
    </div>
  )
}

export default CatalogFiltersBar
