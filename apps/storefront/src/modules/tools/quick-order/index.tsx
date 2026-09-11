"use client"

import { addToCartBulk, retrieveCartSummary } from "@/lib/data/cart"
import { CalcProduct, searchCalcProducts } from "@/lib/data/bizcalc"
import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD, plural } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { PRICE_LIST_URL } from "@/lib/util/marketplaces"
import { clx } from "@medusajs/ui"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

/**
 * «Быстрый заказ» — матричный оптовый заказ, как на старом сайте: ищем модель по названию или артикулу,
 * набираем количество прямо в размерной сетке по нескольким моделям сразу, одной кнопкой — в корзину.
 * Цена — опт; при сумме (с корзиной) от 100 000 ₽ показываем цену крупного опта.
 */
type Row = CalcProduct & { qty: Record<string, number> }

const QuickOrder = () => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<CalcProduct[]>([])
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [cartSum, setCartSum] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { retrieveCartSummary().then((c) => setCartSum(c?.subtotal || 0)).catch(() => {}) }, [])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setHits([]); return }
    timer.current = setTimeout(() => searchCalcProducts(q.trim()).then((r) => { setHits(r.slice(0, 12)); setOpen(true) }).catch(() => setHits([])), 250)
  }, [q])

  const add = (p: CalcProduct) => { if (!rows.some((r) => r.id === p.id)) setRows((rs) => [...rs, { ...p, qty: {} }]); setQ(""); setHits([]); setOpen(false) }
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id))
  const setQty = (id: string, vid: string, v: number) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, qty: { ...r.qty, [vid]: Math.max(0, v) } } : r)))
  const fillRow = (r: Row, packs: number) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, qty: Object.fromEntries(x.variants.filter((v) => v.stock > 0).map((v) => [v.id, Math.min(v.stock, (v.step || 1) * packs)])) } : x)))

  const lines = rows.flatMap((r) => r.variants.map((v) => ({ r, v, n: r.qty[v.id] || 0 })).filter((x) => x.n > 0))
  const pieces = lines.reduce((a, x) => a + x.n, 0)
  const optSum = lines.reduce((a, x) => a + x.n * x.r.opt, 0)
  const krupny = cartSum + optSum >= KRUPNY_THRESHOLD
  const total = lines.reduce((a, x) => a + x.n * (krupny && x.r.krupny > 0 ? x.r.krupny : x.r.opt), 0)
  const weight = lines.reduce((a, x) => a + x.n * (x.r.weight || 0), 0)
  const level = cartSum + optSum

  const submit = async () => {
    if (!lines.length) return
    setBusy(true)
    try {
      await addToCartBulk({ lineItems: lines.map((x) => ({ variant_id: x.v.id, quantity: x.n })), countryCode })
      setDone(`Добавили в корзину ${pieces} ${plural(pieces, "штуку", "штуки", "штук")} на ${formatRub(total)}`)
      setCartSum((c) => c + optSum); setRows([]); router.refresh()
    } catch { setDone("Не получилось добавить — попробуйте ещё раз.") }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="oh-card flex flex-col gap-3 bg-oh-paper p-4 small:flex-row small:items-center small:justify-between">
        <p className="max-w-[640px] text-[14px] text-oh-graphite">Найдите модель по названию или артикулу и наберите количество прямо в размерной сетке — как в заказе по прайсу, только быстрее. Опт от {formatRub(OPT_THRESHOLD)}, крупный опт от {formatRub(KRUPNY_THRESHOLD)} применяется сам.</p>
        <div className="flex flex-wrap gap-2">
          <a href={PRICE_LIST_URL} className="oh-btn-ghost whitespace-nowrap">Скачать прайс (Excel)</a>
          <LocalizedClientLink href="/biznes-s-ohanoy" className="oh-btn-ghost whitespace-nowrap">Бизнес-калькулятор</LocalizedClientLink>
        </div>
      </div>

      <div className="oh-card p-4">
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Название или артикул: халат, пижама, БЖ-01-23…" className="h-12 w-full rounded-xl border border-oh-line-2 px-4 text-[15px] outline-none focus:border-oh-azure" autoFocus />
          {open && hits.length > 0 && (
            <ul className="absolute left-0 right-0 top-[52px] z-30 max-h-[420px] overflow-auto rounded-xl border border-oh-line bg-white shadow-[0_18px_44px_rgba(43,48,56,0.16)]">
              {hits.map((p) => (
                <li key={p.id}>
                  <button type="button" onMouseDown={() => add(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-oh-paper">
                    {p.img ? <img src={p.img} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-oh-paper" />}
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-oh-ink">{p.name}</span>
                      <span className="block text-[12px] text-oh-muted">{p.code && `Арт. ${p.code} · `}{formatRub(p.opt)}/шт · в наличии {p.stock} шт</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {q.trim().length >= 2 && !hits.length && <div className="pt-3 text-[13.5px] text-oh-muted">Ничего не нашли — попробуйте часть названия или артикул.</div>}

        {rows.map((r) => (
          <div key={r.id} className="mt-4 rounded-xl border border-oh-line p-3">
            <div className="mb-2 flex items-center gap-3">
              {r.img ? <img src={r.img} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-oh-paper" />}
              <div className="min-w-0 flex-1">
                <LocalizedClientLink href={`/products/${r.handle}`} className="block truncate text-[14px] font-semibold text-oh-ink hover:text-oh-azure">{r.name}</LocalizedClientLink>
                <span className="text-[12px] text-oh-muted">{r.code && `Арт. ${r.code} · `}опт {formatRub(r.opt)}{r.krupny > 0 && ` · крупный опт ${formatRub(r.krupny)}`}{r.lineika ? ` · комплект ${r.per || r.step} шт (полная линейка)` : r.pack ? ` · упаковка ${r.per || r.step} шт` : r.step > 1 ? ` · кратно ${r.step} шт` : ""}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => fillRow(r, 1)} className="oh-chip !py-1 !text-[12px]">полный ряд</button>
                <button type="button" onClick={() => remove(r.id)} aria-label="Убрать модель" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-oh-paper text-oh-muted hover:bg-oh-primary/10 hover:text-oh-primary">×</button>
              </div>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {r.variants.map((v) => {
                const n = r.qty[v.id] || 0, out = v.stock <= 0
                return (
                  <div key={v.id} className={clx("min-w-[96px] shrink-0 rounded-lg border p-2 text-center", n > 0 ? "border-oh-azure bg-oh-azure/5" : "border-oh-line", out && "opacity-50")}>
                    <div className="whitespace-nowrap text-[13px] font-bold text-oh-ink">{v.size || "—"}</div>
                    <div className="text-[11.5px] text-oh-muted">{out ? "нет" : `${v.stock} шт`}</div>
                    <input type="number" min={0} step={v.step || 1} max={v.stock} disabled={out} value={n || ""} placeholder="0" onChange={(e) => setQty(r.id, v.id, Math.min(v.stock, Number(e.target.value) || 0))} onBlur={(e) => { const st = v.step || 1; const val = Number(e.target.value) || 0; if (st > 1 && val % st) setQty(r.id, v.id, Math.min(v.stock, Math.ceil(val / st) * st)) }} className="mt-1.5 h-9 w-full rounded-lg border border-oh-line-2 text-center text-[14px] font-semibold outline-none focus:border-oh-azure [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {rows.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t-2 border-oh-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-oh-graphite">
              <span>Выбрано <b className="text-oh-ink">{pieces} шт</b>{weight > 0 && <> · вес ≈ <b className="text-oh-ink">{weight.toFixed(1)} кг</b></>}</span>
              <span className="text-[19px] font-semibold text-oh-primary">{formatRub(total)}</span>
            </div>
            <div className={clx("rounded-lg border px-3 py-2 text-[12.5px]", krupny ? "border-oh-azure/40 bg-oh-azure/5 text-oh-azure" : level >= OPT_THRESHOLD ? "border-oh-mint-deep/40 bg-white text-oh-ink" : "border-oh-gold/40 bg-white text-oh-graphite")}>
              {krupny ? `Крупный опт — цены крупного опта на всю корзину (${formatRub(level)}).` : level >= OPT_THRESHOLD ? `Опт набран. До крупного опта не хватает ${formatRub(KRUPNY_THRESHOLD - level)}.` : `До минимального опта не хватает ${formatRub(OPT_THRESHOLD - level)}${cartSum > 0 ? ` (в корзине уже ${formatRub(cartSum)})` : ""}.`}
            </div>
            <button type="button" onClick={submit} disabled={!lines.length || busy} className="oh-btn h-12 text-[15px]">{busy ? "Добавляем…" : `В корзину — ${pieces} шт на ${formatRub(total)}`}</button>
          </div>
        )}
        {done && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-oh-mint-deep/40 bg-white px-4 py-2.5 text-[14px] text-oh-ink">
            <span>{done}</span>
            <LocalizedClientLink href="/cart" className="font-medium text-oh-azure hover:underline">Перейти в корзину →</LocalizedClientLink>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickOrder
