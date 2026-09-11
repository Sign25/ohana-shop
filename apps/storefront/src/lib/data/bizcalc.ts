import { sdk } from "@/lib/config"

/** Товар для калькуляторов: цены и размеры с остатком (маршрут /store/ohana/bizcalc-search) */
export type CalcProduct = {
  id: string
  handle: string
  name: string
  code: string
  img: string | null
  opt: number
  krupny: number
  rrc: number
  weight: number
  step: number
  /** «Номенклатура 2026»: продажа комплектом (полной линейкой) по per штук; pack — упаковка (продукты) */
  lineika?: boolean
  pack?: boolean
  per?: number
  stock: number
  variants: { id: string; size: string; stock: number; step: number }[]
}

export const searchCalcProducts = (q: string) =>
  sdk.client.fetch<CalcProduct[]>(`/store/ohana/bizcalc-search`, { method: "GET", query: { q }, cache: "no-store" })

/** Раскладка количества по размерам с остатком: поровну, кратно упаковке, не больше остатка */
export const spreadBySizes = (p: CalcProduct, qty: number): { variant_id: string; quantity: number }[] => {
  const vs = p.variants.filter((v) => v.stock > 0)
  if (!vs.length) return []
  const step = Math.max(1, p.step)
  const packs = Math.max(1, Math.round(qty / step))
  const out = vs.map((v) => ({ variant_id: v.id, quantity: 0, max: Math.floor(v.stock / step) }))
  let left = packs, i = 0, guard = 0
  while (left > 0 && guard++ < 100000) {
    const o = out[i % out.length]
    if (o.quantity < o.max) { o.quantity++; left-- } else if (out.every((x) => x.quantity >= x.max)) break
    i++
  }
  return out.filter((o) => o.quantity > 0).map((o) => ({ variant_id: o.variant_id, quantity: o.quantity * step }))
}
