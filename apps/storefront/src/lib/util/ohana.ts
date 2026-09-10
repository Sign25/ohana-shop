import { HttpTypes } from "@medusajs/types"

/** Порог автоматического крупного опта (как на текущем сайте) */
export const KRUPNY_THRESHOLD = 100000
export const OPT_THRESHOLD = 35000

/** Подписи верхнего меню по названиям разделов из 1С */
const AUDIENCE_LABELS: [RegExp, string][] = [
  [/женск/i, "Женщинам"],
  [/мужск/i, "Мужчинам"],
  [/девоч/i, "Девочкам"],
  [/мальчик/i, "Мальчикам"],
  [/текстиль|дом/i, "Дом"],
  [/аксессуар/i, "Аксессуары"],
  [/продукт|питан/i, "Продукты"],
]

/** Подборки, убранные владельцем из меню текущего сайта (Школа, Лето 2026), и порядок остальных */
export const HIDDEN_SHOWCASES = new Set(["shkola", "leto-2026"])
export const SHOWCASE_ORDER = ["osen-zima-2027", "big-size"]
export const visibleShowcases = <T extends { handle: string; parent_category_id?: string | null; metadata?: any }>(cats: T[]) =>
  cats
    .filter((c) => !c.parent_category_id && c.metadata?.kind === "showcase" && !HIDDEN_SHOWCASES.has(c.handle))
    .sort((a, b) => {
      const ia = SHOWCASE_ORDER.indexOf(a.handle), ib = SHOWCASE_ORDER.indexOf(b.handle)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

export const audienceLabel = (name: string) => {
  const hit = AUDIENCE_LABELS.find(([re]) => re.test(name))
  return hit ? hit[1] : name
}

export const formatRub = (amount: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

type VariantMeta = {
  pack_qty?: number | null
  qty_step?: number | null
  min_qty?: number | null
  price_krupny?: number | null
  price_sale?: number | null
  size?: string | null
  color?: string | null
}

/** Сводка по товару для карточки и страницы: цены, остаток, упаковка */
export const productSummary = (product: HttpTypes.StoreProduct) => {
  const variants = (product.variants || []) as any[]
  const prices = variants
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((p): p is number => typeof p === "number" && p > 0)
  const krupny = variants
    .map((v) => (v.metadata as VariantMeta)?.price_krupny)
    .filter((p): p is number => typeof p === "number" && p > 0)
  const stock = variants.reduce(
    (acc, v) => acc + (typeof v.inventory_quantity === "number" ? v.inventory_quantity : 0),
    0
  )
  const inStockSizes = variants.filter((v) => (v.inventory_quantity ?? 0) > 0).length
  const firstMeta = (variants[0]?.metadata || {}) as VariantMeta
  const packQty = variants
    .map((v) => Number((v.metadata as VariantMeta)?.pack_qty) || 0)
    .find((n) => n > 0) || null
  const meta = (product.metadata || {}) as Record<string, any>
  return {
    code: meta.code as string | undefined,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    minKrupny: krupny.length ? Math.min(...krupny) : null,
    stock,
    inStockSizes,
    sizesTotal: variants.length,
    packQty,
    packUnit: (firstMeta as any)?.pack_unit as string | undefined,
    sizeRange: meta.size_range as string | undefined,
    composition: meta.composition as string | undefined,
    model: meta.model as string | undefined,
    manufacturer: meta.manufacturer as string | undefined,
    meta,
  }
}

/** Характеристики для вкладки — подписи в порядке, как на текущем сайте */
export const productSpecs = (product: HttpTypes.StoreProduct) => {
  const m = (product.metadata || {}) as Record<string, any>
  const rows: [string, string][] = []
  const add = (label: string, v?: any) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") rows.push([label, String(v)])
  }
  add("Артикул", m.code)
  add("Модель", m.model)
  add("Размерная линейка", m.size_range)
  add("Состав", m.composition)
  add("Цвет", m.color_label)
  add("Изготовитель", m.manufacturer)
  if (product.weight) add("Вес", `${product.weight} г`)
  add("Документ соответствия", m.cert_doc)
  add("Дата выдачи", m.cert_issued)
  add("Действует до", m.cert_until)
  add("Орган сертификации", m.cert_org)
  return rows
}
