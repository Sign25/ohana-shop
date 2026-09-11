"use client"

import { WbRating, WbReview } from "@/lib/data/wb"
import { loadWbReviews } from "@/lib/data/wb-actions"
import { plural } from "@/lib/util/ohana"
import { Stars } from "@/modules/products/components/wb-rating"
import { useState } from "react"

/** Вкладка «Отзывы»: сводка рейтинга Wildberries (распределение по звёздам) и тексты отзывов постранично */
const WbReviews = ({ code, rating, initial, distribution }: { code: string; rating: (WbRating & { synced_at?: string | null }) | null; initial: WbReview[]; distribution: Record<string, number> }) => {
  const [items, setItems] = useState<WbReview[]>(initial)
  const [busy, setBusy] = useState(false)
  const total = rating?.texts || items.length
  const more = async () => { setBusy(true); const r = await loadWbReviews(code, items.length); setItems((x) => [...x, ...r.reviews]); setBusy(false) }
  const distTotal = Object.values(distribution).reduce((a, b) => a + b, 0) || 1
  const fmt = (d: string) => { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : d }
  if (!rating || !rating.count) return <p className="py-6 text-sm text-oh-muted">Отзывов на Wildberries по этой модели пока нет.</p>
  return (
    <div id="otzyvy" className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-4 small:flex-row small:items-start">
        <div className="flex shrink-0 flex-col items-center rounded-card border border-oh-line bg-oh-paper px-6 py-4">
          <div className="text-[40px] font-semibold leading-none text-oh-ink">{rating.rating.toFixed(2)}</div>
          <Stars value={rating.rating} size={18} />
          <div className="mt-1 text-[12.5px] text-oh-graphite">{rating.count} {plural(rating.count, "оценка", "оценки", "оценок")} · {rating.texts} {plural(rating.texts, "отзыв", "отзыва", "отзывов")}</div>
          <div className="text-[11.5px] text-oh-muted">покупатели Wildberries</div>
        </div>
        <div className="flex w-full max-w-[420px] flex-col gap-1">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = distribution[String(s)] || 0
            return (
              <div key={s} className="flex items-center gap-2 text-[12.5px] text-oh-graphite">
                <span className="w-3 text-right">{s}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-pill bg-oh-line"><span className="block h-full rounded-pill bg-oh-gold" style={{ width: `${(n / distTotal) * 100}%` }} /></span>
                <span className="w-10 text-right tabular-nums">{n}</span>
              </div>
            )
          })}
          <p className="mt-2 text-[12px] text-oh-muted">Это оценки розничных покупателей той же модели на маркетплейсе — ориентир для спроса и качества. Опт покупают здесь, по ценам производителя.</p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-oh-line">
        {items.map((r, i) => (
          <li key={i} className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-oh-graphite">
              <Stars value={r.valuation} size={12} />
              <span className="font-medium text-oh-ink">{r.author || "Покупатель"}</span>
              <span className="text-oh-muted">{fmt(r.date)}</span>
            </div>
            <p className="whitespace-pre-line text-[14px] text-oh-ink">{r.body}</p>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <button type="button" onClick={more} disabled={busy} className="oh-btn-ghost w-fit">{busy ? "Загружаем…" : `Показать ещё (${total - items.length})`}</button>
      )}
    </div>
  )
}

export default WbReviews
