import { MinusMini, PlusMini } from "@medusajs/icons"
import { IconButton, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"

type BulkTableQuantityProps = {
  variantId: string
  onChange: (variantId: string, quantity: number) => void
  /** кратность заказа (вложение упаковки из 1С), по умолчанию 1 */
  step?: number
  /** доступный остаток; 0 — размер закончился */
  max?: number
  /** стартовое значение (быстрая заливка ряда) */
  initial?: number
}

/** Счётчик количества в таблице размеров: шаг = упаковка, Shift — ×10 шагов, не больше остатка */
const BulkTableQuantity = ({ variantId, onChange, step = 1, max, initial = 0 }: BulkTableQuantityProps) => {
  const [quantity, setQuantity] = useState(String(initial || 0))
  const [shiftPressed, setShiftPressed] = useState(false)
  const s = Math.max(1, step || 1)
  const limit = typeof max === "number" ? Math.max(0, max) : Infinity
  const clamp = (q: number) => Math.min(limit, Math.max(0, q))
  const roundToStep = (q: number) => (s > 1 ? Math.ceil(q / s) * s : q)

  const apply = (q: number) => {
    const v = clamp(q)
    setQuantity(v.toString())
    onChange(variantId, v)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(e.target.value)
    onChange(variantId, clamp(Number(e.target.value) || 0))
  }
  const handleBlur = () => apply(roundToStep(Number(quantity) || 0))
  const handleAdd = () => apply(Number(quantity) + s * (shiftPressed ? 10 : 1))
  const handleSubtract = () => apply(Number(quantity) - s * (shiftPressed ? 10 : 1))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); handleAdd() }
    if (e.key === "ArrowDown") { e.preventDefault(); handleSubtract() }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Shift" && setShiftPressed(true)
    const up = (e: KeyboardEvent) => e.key === "Shift" && setShiftPressed(false)
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  const soldOut = limit === 0

  return (
    <div className="flex w-full flex-row items-center justify-between gap-1">
      <IconButton onClick={handleSubtract} disabled={soldOut || Number(quantity) <= 0} className="!h-11 !w-11 rounded-full hover:bg-oh-paper" variant="transparent" aria-label="Меньше">
        <MinusMini />
      </IconButton>
      <Input
        value={quantity}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        type="number"
        min={0}
        step={s}
        disabled={soldOut}
        title={soldOut ? "Размер закончился" : s > 1 ? `Кратно ${s} шт` : undefined}
        inputMode="numeric"
        className="!h-11 max-w-14 items-center justify-center text-center text-[15px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <IconButton onClick={handleAdd} disabled={soldOut || Number(quantity) + s > limit} className="!h-11 !w-11 rounded-full hover:bg-oh-paper" variant="transparent" aria-label="Больше">
        <PlusMini />
      </IconButton>
    </div>
  )
}

export default BulkTableQuantity
