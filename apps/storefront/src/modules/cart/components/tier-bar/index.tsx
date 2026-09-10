"use client"

import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD } from "@/lib/util/ohana"
import { clx } from "@medusajs/ui"

/**
 * Полоса уровня цен как в корзине текущего сайта (ohana-cart-tierbar):
 * до 35 000 ₽ заказ не оформить, от 100 000 ₽ все позиции по цене крупного опта.
 * Сумма берётся по базовым оптовым ценам (item.metadata.base_price), чтобы порог не «плавал».
 */
const TierBar = ({ cart, compact }: { cart: any; compact?: boolean }) => {
  if (!cart?.items?.length) return null
  const base = cart.items.reduce(
    (acc: number, i: any) => acc + (Number(i.metadata?.base_price) || Number(i.unit_price) || 0) * i.quantity,
    0
  )
  const pct = Math.min(100, (base / KRUPNY_THRESHOLD) * 100)
  const optPct = (OPT_THRESHOLD / KRUPNY_THRESHOLD) * 100
  const isKrupny = base >= KRUPNY_THRESHOLD
  const isOpt = base >= OPT_THRESHOLD

  let text: string
  if (isKrupny) text = "Действует цена крупного опта"
  else if (isOpt) text = `До крупного опта ещё ${formatRub(KRUPNY_THRESHOLD - base)}`
  else text = `До минимального заказа ещё ${formatRub(OPT_THRESHOLD - base)}`

  return (
    <div className={clx("flex flex-col gap-1.5", compact ? "text-[11px]" : "text-[12px]")} title="Опт от 35 000 ₽ · крупный опт от 100 000 ₽">
      <div className="flex items-center justify-between">
        <span className={clx("font-medium", isKrupny ? "text-oh-azure" : isOpt ? "text-oh-ink" : "text-oh-primary")}>{text}</span>
        <span className="text-oh-muted">{formatRub(base)}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-pill bg-oh-line">
        <div
          className={clx("absolute inset-y-0 left-0 rounded-pill transition-[width] duration-500", isKrupny ? "bg-oh-azure" : "bg-gradient-to-r from-oh-gold to-oh-primary")}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-white/90" style={{ left: `${optPct}%` }} />
      </div>
      {!compact && (
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-oh-muted">
          <span>0</span>
          <span style={{ marginLeft: `${optPct - 8}%` }}>опт {formatRub(OPT_THRESHOLD)}</span>
          <span>крупный опт {formatRub(KRUPNY_THRESHOLD)}</span>
        </div>
      )}
    </div>
  )
}

export default TierBar
