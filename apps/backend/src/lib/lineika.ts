/**
 * «Номенклатура 2026» (каталог 1С ae74d1c1…): товар продаётся ТОЛЬКО полной размерной линейкой —
 * одна единица заказа = комплект из set_qty штук («Количество товаров в упаковке»), размер = «Размерная линейка».
 * На сайте такой товар = один вариант «Комплект» с guid номенклатуры (без «#»), qty_step = set_qty.
 * Товары-упаковки (соки): pack_unit 'Y' — цена и остаток за упаковку; 'S' — цена за штуку, заказ упаковками.
 */
export const LINEIKA_CATALOG = "ae74d1c1-d544-4c35-8535-3be0527db8b0"
export const LINEIKA_GROUP = "Номенклатура 2026"

export const setTitle = (sizeRange?: string | null) => (sizeRange ? `Комплект ${sizeRange}` : "Комплект")

/** Вариант-комплект для createProductVariantsWorkflow / createProductsWorkflow */
export function setVariant(p: { article: string; nom: string; sizeRange?: string | null; color?: string | null; setQty: number; packUnit?: string; weight?: number; barcode?: string | null; price?: number; length?: number; width?: number; height?: number }) {
  const step = Math.max(1, p.setQty || 1)
  return {
    title: setTitle(p.sizeRange), sku: `${p.article || "art"}-set`, manage_inventory: true, allow_backorder: false,
    options: { Размер: p.sizeRange || "Комплект" },
    weight: p.weight || undefined, length: p.length || undefined, width: p.width || undefined, height: p.height || undefined,
    prices: p.price ? [{ amount: p.price, currency_code: "rub" }] : undefined,
    metadata: { guid: p.nom, size: p.sizeRange || "", color: p.color || "", pack_qty: step, pack_unit: p.packUnit || "N", qty_step: step, min_qty: step, barcode: p.barcode || null, source: "1c", lineika: true },
  }
}

/** Вес за штуку в граммах: 1С отдаёт «килограммовый» вес за упаковку (≥1000 г) — делим на вложение, кроме товаров-упаковок */
export function unitGrams(raw: number, packQty: number | null, packUnit?: string): number {
  let g = Math.round(raw || 0)
  if (g >= 1000 && packUnit !== "Y" && packQty && packQty > 1) g = Math.round(g / packQty)
  return g
}

/** Чистое название витрины: без ведущего артикула, «модель:», «цвет:X», хвостов «(Цвет …, размер …)» */
export function cleanTitle(name: string): string {
  let t = name.replace(/\s+/g, " ").trim().replace(/^\d{4,6}\s+/, "")
  t = t.replace(/\s*\(\s*(?:x?цвет|размер)[\s\S]*$/i, "").replace(/\s*\(\s*\d{2,3}(?:\s*-\s*\d{2,3})?(?:\s*\/\s*\d{2,3})?\s*(?:см)?\s*\)\s*$/, "")
  t = t.replace(/,?\s*модель:\s*/gi, " ").replace(/\s*цвет\s*:\s*\S+/gi, "")
  t = t.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").replace(/[\s,]+$/, "").trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
