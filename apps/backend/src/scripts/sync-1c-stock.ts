/**
 * Остатки из 1С напрямую (регистр «Запасы и потребности», свободный остаток) → уровни запаса Medusa.
 * Сопоставление по GUID из metadata варианта (`guid` = «номенклатура#характеристика», как в CommerceML)
 * или товара (`guid` = номенклатура) для одиночных карточек. Кэш обмена 1С врёт после «Сборки/разборки»,
 * поэтому, как и на старом сайте, остатки берём из первичного регистра раз в час.
 *
 *   npx medusa exec ./src/scripts/sync-1c-stock.ts [dry] [quiet]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateInventoryLevelsWorkflow, createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"
import { OnecMcp, Q_SCOPE, Q_STOCK, ZERO_GUID } from "../lib/onec-mcp"

export default async function syncStock({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  const t0 = Date.now()

  const mcp = new OnecMcp()
  const scopeRows = await mcp.query(Q_SCOPE)
  const inScope = new Set(scopeRows.map((r) => String(r["Ном__id"] || "").toLowerCase()).filter(Boolean))
  const rows = await mcp.query(Q_STOCK)
  const byKey = new Map<string, number>()
  const byNom = new Map<string, number>()
  for (const r of rows) {
    const nom = String(r["Ном__id"] || "").toLowerCase()
    const har = String(r["Хар__id"] || "").toLowerCase()
    if (!nom) continue
    const qty = Number(r["Кол"]) || 0
    const key = !har || har === ZERO_GUID ? nom : `${nom}#${har}`
    byKey.set(key, (byKey.get(key) || 0) + qty)
    // сумма по номенклатуре (комплекты «Номенклатуры 2026»): отрицательные строки размеров — недостачи учёта,
    // в сумму не идут, иначе комплект уходит в ноль (так же делал старый сайт)
    if (qty > 0) byNom.set(nom, (byNom.get(nom) || 0) + qty)
    else if (!byNom.has(nom)) byNom.set(nom, 0)
  }
  logger.info(`1С: номенклатуры на сайте ${inScope.size}, строк остатков ${rows.length} (${((Date.now() - t0) / 1000).toFixed(1)} с)`)

  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id", "name"] })
  const location = locations.find((l: any) => l.name === "Оптовый склад Омск") || locations[0]
  if (!location) throw new Error("нет склада")

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "metadata", "product.id", "product.metadata", "product.variants.id", "inventory_items.inventory_item_id"],
  })
  const { data: levels } = await query.graph({ entity: "inventory_level", fields: ["inventory_item_id", "stocked_quantity"], filters: { location_id: location.id } })
  const levelByItem = new Map(levels.map((l: any) => [l.inventory_item_id, Number(l.stocked_quantity)]))

  const updates: any[] = []
  const creates: any[] = []
  let matched = 0, skipped = 0
  const examples: string[] = []
  const unmatched: string[] = []
  for (const v of variants) {
    const item = v.inventory_items?.[0]?.inventory_item_id
    if (!item) continue
    const vg = String(v.metadata?.guid || "").toLowerCase()
    const pg = String(v.product?.metadata?.guid || "").toLowerCase()
    const single = (v.product?.variants?.length || 1) === 1
    let want: number | undefined
    const nom = (vg.split("#")[0] || pg)
    if (vg && byKey.has(vg)) want = byKey.get(vg)
    else if (single && nom && byNom.has(nom)) want = byNom.get(nom)
    else if (nom && inScope.has(nom)) want = 0 // номенклатура на сайте, но остатка в регистре нет → распродано
    if (want === undefined) { skipped++; if (unmatched.length < 12) unmatched.push(`${v.sku} [${vg || pg || "без guid"}]`); continue }
    matched++
    const packMult = v.metadata?.pack_unit === "S" ? Math.max(1, Number(v.metadata?.pack_qty) || 1) : 1
    const target = Math.max(0, Math.round(want * packMult))
    const cur = levelByItem.get(item)
    if (cur === undefined) creates.push({ inventory_item_id: item, location_id: location.id, stocked_quantity: target })
    else if (cur !== target) {
      updates.push({ inventory_item_id: item, location_id: location.id, stocked_quantity: target })
      if (examples.length < 8) examples.push(`${v.sku}: ${cur} → ${target}`)
    }
  }
  logger.info(`сопоставлено вариантов ${matched}, без соответствия в 1С ${skipped}; изменений ${updates.length}, новых уровней ${creates.length}${dry ? " (dry)" : ""}`)
  if (examples.length) logger.info("примеры: " + examples.join("; "))
  if (unmatched.length) logger.info("без соответствия (первые): " + unmatched.join("; "))
  if (dry) return
  for (let i = 0; i < updates.length; i += 200) await updateInventoryLevelsWorkflow(container).run({ input: { updates: updates.slice(i, i + 200) } })
  for (let i = 0; i < creates.length; i += 200) await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: creates.slice(i, i + 200) } })
  logger.info(`готово за ${((Date.now() - t0) / 1000).toFixed(1)} с`)
}
