/**
 * Разовая разметка комплектов («Номенклатура 2026») и товаров-упаковок по данным старого сайта и выгрузки узла 007:
 *  - product.metadata.lineika = true, set_qty; variant.metadata.pack_unit (Y/S) для упаковок;
 *  - товары, которые импорт по ошибке разложил по размерам, схлопываются в один вариант «Комплект».
 * Источники: /srv/ohana/shared/cml/old_lineika.tsv (guid, …, lineika, pack, step, amount, pkg, sizes) и lineika_guids_007.txt.
 * Запуск: npx medusa exec ./src/scripts/mark-lineika.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductVariantsWorkflow, deleteProductVariantsWorkflow, updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import { setVariant } from "../lib/lineika"

export default async function markLineika({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")

  const old = new Map<string, { lineika: boolean; pack: string; pkg: number; sizes: string }>()
  for (const line of fs.readFileSync("/srv/ohana/shared/cml/old_lineika.tsv", "utf8").split("\n")) {
    const [guid, , , lineika, pack, , , pkg, sizes] = line.split("\t"); if (!guid) continue
    const nom = guid.split("#")[0].toLowerCase()
    const cur = old.get(nom) || { lineika: false, pack: "N", pkg: 0, sizes: "" }
    old.set(nom, { lineika: cur.lineika || lineika === "Y", pack: pack === "Y" || pack === "S" ? pack : cur.pack, pkg: Math.max(cur.pkg, Number(pkg) || 0), sizes: sizes && sizes !== "NULL" ? sizes : cur.sizes })
  }
  const nom007 = new Set(fs.readFileSync("/srv/ohana/shared/cml/lineika_guids_007.txt", "utf8").split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean))
  const lineikaSet = new Set([...nom007, ...[...old.entries()].filter(([, v]) => v.lineika).map(([k]) => k)])

  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "handle", "metadata", "options.id", "options.title", "options.values.value", "variants.id", "variants.sku", "variants.weight", "variants.metadata", "variants.prices.amount", "variants.prices.currency_code", "variants.prices.price_list_id"] })
  let marked = 0, collapsed = 0, packs = 0
  for (const p of products) {
    const nom = String(p.metadata?.guid || "").toLowerCase()
    if (!nom || !lineikaSet.has(nom)) continue
    const o = old.get(nom)
    const variants: any[] = p.variants || []
    const setQty = Math.max(o?.pkg || 0, ...variants.map((v) => Number(v.metadata?.qty_step) || 0), 1)
    const packUnit = o?.pack === "Y" || o?.pack === "S" ? o.pack : (variants[0]?.metadata?.pack_unit === "Y" || variants[0]?.metadata?.pack_unit === "S" ? variants[0].metadata.pack_unit : "N")
    const sizeRange = String(p.metadata?.size_range || o?.sizes || "").trim()
    const isPack = packUnit !== "N"
    if (isPack) packs++
    marked++
    if (dry) { if (variants.length > 1) logger.info(`[dry] схлопнуть «${p.title}»: ${variants.length} вариантов → комплект ${sizeRange} × ${setQty}`); continue }

    await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata || {}), lineika: !isPack, pack: isPack, set_qty: setQty } } } })

    if (variants.length <= 1) {
      // единичный вариант: выровнять metadata (guid без «#», размер = линейка, шаг = комплект)
      const v = variants[0]; if (!v) continue
      const meta = { ...(v.metadata || {}), guid: nom, size: isPack ? (v.metadata?.size || "") : sizeRange || v.metadata?.size || "", pack_qty: setQty, pack_unit: packUnit, qty_step: isPack && packUnit === "Y" ? 1 : setQty, min_qty: isPack && packUnit === "Y" ? 1 : setQty, lineika: !isPack }
      await updateProductVariantsWorkflow(container).run({ input: { product_variants: [{ id: v.id, metadata: meta }] } })
      continue
    }
    // схлопывание размерных вариантов в один комплект (ошибка первого импорта узла 007)
    const base = variants.find((v) => (v.prices || []).some((pr: any) => !pr.price_list_id)) || variants[0]
    const price = (base.prices || []).find((pr: any) => !pr.price_list_id && pr.currency_code === "rub")?.amount
    const sizeOpt = (p.options || []).find((op: any) => op.title === "Размер")
    const optValue = sizeRange || "Комплект"
    if (sizeOpt && !sizeOpt.values.some((x: any) => x.value === optValue)) {
      await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { options: [{ id: sizeOpt.id, title: "Размер", values: [...sizeOpt.values.map((x: any) => x.value), optValue] }] } } })
    }
    const nv = setVariant({ article: String(p.metadata?.code || "art"), nom, sizeRange, color: base.metadata?.color, setQty, packUnit, weight: base.weight || undefined, barcode: base.metadata?.barcode, price: Number(price) || undefined })
    if (!sizeOpt) (nv as any).options = { Вариант: "Стандарт" }
    ;(nv as any).metadata.price_krupny = base.metadata?.price_krupny ?? null
    await createProductVariantsWorkflow(container).run({ input: { product_variants: [{ ...nv, product_id: p.id }] } })
    await deleteProductVariantsWorkflow(container).run({ input: { ids: variants.map((v) => v.id) } })
    collapsed++
    logger.info(`«${p.title}»: ${variants.length} размеров → комплект ${optValue} × ${setQty}`)
  }
  logger.info(`размечено комплектов/упаковок: ${marked} (упаковок ${packs}), схлопнуто товаров: ${collapsed}${dry ? " (dry)" : ""}`)
}
