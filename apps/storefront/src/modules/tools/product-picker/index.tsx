"use client"

import { CalcProduct, searchCalcProducts } from "@/lib/data/bizcalc"
import { formatRub } from "@/lib/util/ohana"
import { useEffect, useRef, useState } from "react"

/** Поиск товара по названию/артикулу с выпадающим списком — общий для калькуляторов */
const ProductPicker = ({ onPick, exclude = [], placeholder }: { onPick: (p: CalcProduct) => void; exclude?: string[]; placeholder?: string }) => {
  const [q, setQ] = useState("")
  const [list, setList] = useState<CalcProduct[] | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const v = q.trim()
    if (v.length < 2) { setList(null); setOpen(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      searchCalcProducts(v).then((r) => { setList(r); setOpen(true) }).catch(() => setList([])).finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [])

  const shown = (list || []).filter((p) => !exclude.includes(p.id))
  return (
    <div ref={box} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => list && setOpen(true)}
        placeholder={placeholder || "Название или артикул: халат, 15100…"}
        autoComplete="off"
        aria-label="Поиск товара"
        className="h-11 w-full rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink placeholder:text-oh-muted/70 focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15"
      />
      {loading && <span className="absolute right-3 top-3 text-[12px] text-oh-muted">ищем…</span>}
      {open && list && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[360px] overflow-y-auto rounded-lg border border-oh-line bg-white shadow-lg">
          {shown.length === 0 && <div className="px-3 py-3 text-[13px] text-oh-muted">Ничего не найдено среди товаров в наличии</div>}
          {shown.map((p) => (
            <button key={p.id} type="button" onClick={() => { onPick(p); setQ(""); setOpen(false) }} className="flex w-full items-center gap-3 border-b border-oh-line px-3 py-2 text-left hover:bg-oh-paper">
              {p.img && <img src={p.img} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-oh-ink">{p.name}</span>
                <span className="block text-[12px] text-oh-muted">Арт. {p.code} · в наличии {p.stock} шт{p.step > 1 ? ` · упаковка ${p.step} шт` : ""}</span>
              </span>
              <span className="shrink-0 text-right text-[14px] font-semibold text-oh-ink">
                {formatRub(p.opt)}
                <span className="block text-[11px] font-normal text-oh-muted">за шт · опт</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductPicker
