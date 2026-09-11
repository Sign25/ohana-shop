/**
 * «Альтернативы номенклатуры» из 1С (регистр БИТ_АльтернативыНоменклатуры: одинаковый GUID = одна группа —
 * другие расцветки и похожие модели) → product.metadata.alt_group. Обмен CommerceML регистр не возит,
 * поэтому тянем напрямую через MCP, как остатки. Группы, где на сайте < 2 товаров, не пишем.
 *   npx medusa exec ./src/scripts/sync-1c-alternatives.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { OnecMcp } from "../lib/onec-mcp"

export default async function syncAlternatives({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  const rows = await new OnecMcp().query("ВЫБРАТЬ А.GUID КАК Гр, А.Номенклатура КАК Ном ИЗ РегистрСведений.БИТ_АльтернативыНоменклатуры КАК А")
  const groupOfNom = new Map<string, string>()
  for (const r of rows) {
    const grp = String(r["Гр"] || "").toLowerCase().trim(), nom = String(r["Ном__id"] || "").toLowerCase().trim()
    if (grp && nom) groupOfNom.set(nom, grp)
  }
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "metadata"] })
  const members = new Map<string, string[]>()
  for (const p of products) { const g = groupOfNom.get(String(p.metadata?.guid || "").toLowerCase()); if (g) members.set(g, [...(members.get(g) || []), p.id]) }
  let set = 0, cleared = 0
  for (const p of products) {
    const g = groupOfNom.get(String(p.metadata?.guid || "").toLowerCase())
    const want = g && (members.get(g)?.length || 0) >= 2 ? g : null
    const cur = p.metadata?.alt_group || null
    if (want === cur) continue
    if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata || {}), alt_group: want } } } })
    want ? set++ : cleared++
  }
  logger.info(`1С: связей ${rows.length}, групп на сайте (≥2 товаров) ${[...members.values()].filter((m) => m.length >= 2).length}; записано ${set}, снято ${cleared}${dry ? " (dry)" : ""}`)
}
