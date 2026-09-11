import { WbRating } from "@/lib/data/wb"
import { plural } from "@/lib/util/ohana"
import { clx } from "@medusajs/ui"

/** Звёзды рейтинга Wildberries: в плитке — компактно, на карточке — с числом отзывов и ссылкой на вкладку */
export const Stars = ({ value, size = 12 }: { value: number; size?: number }) => (
  <span className="inline-flex items-center gap-px" aria-label={`Оценка ${value.toFixed(1)} из 5`}>
    {[1, 2, 3, 4, 5].map((i) => {
      const fill = Math.max(0, Math.min(1, value - (i - 1)))
      return (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-oh-line-2" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z" /></svg>
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
            <svg viewBox="0 0 24 24" width={size} height={size} className="text-oh-gold" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z" /></svg>
          </span>
        </span>
      )
    })}
  </span>
)

const WbRatingLine = ({ wb, compact, className, reserve }: { wb?: WbRating | null; compact?: boolean; className?: string; reserve?: boolean }) => {
  // в плитке место под рейтинг занято всегда (как на старом сайте) — строки карточек не смещаются
  if (!wb || !wb.count) return reserve ? <span className={clx("inline-flex h-[18px] items-center gap-1 text-[11px] text-oh-muted/70", className)} title="Отзывов на Wildberries пока нет"><Stars value={0} size={11} /><span>нет отзывов</span></span> : null
  if (compact) {
    return (
      <span className={clx("inline-flex h-[18px] items-center gap-1 text-[12px] text-oh-graphite", className)} title={`Wildberries: ${wb.rating.toFixed(2)} · ${wb.count} ${plural(wb.count, "отзыв", "отзыва", "отзывов")}`}>
        <Stars value={wb.rating} size={11} />
        <span className="font-medium text-oh-ink">{wb.rating.toFixed(1)}</span>
        <span className="text-oh-muted">({wb.count})</span>
      </span>
    )
  }
  return (
    <a href="#otzyvy" className={clx("inline-flex flex-wrap items-center gap-2 text-[13px] text-oh-graphite hover:text-oh-azure", className)}>
      <Stars value={wb.rating} size={15} />
      <span className="font-semibold text-oh-ink">{wb.rating.toFixed(2)}</span>
      <span>{wb.count} {plural(wb.count, "отзыв", "отзыва", "отзывов")} на Wildberries</span>
    </a>
  )
}

export default WbRatingLine
