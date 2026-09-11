/**
 * Разовый перенос тегов 1С в product.metadata.tags: для каталога ОПТ+РОЗН — из export_catalog.json старого сайта
 * (характеристики-теги «Лето», «Школа», «Хит продаж»… по вариациям группы), для «Номенклатуры 2026» — из текущего
 * import0_1.xml (свойства со значением «Да»). Дальше теги поддерживает ночной import-commerceml.
 *   npx medusa exec ./src/scripts/import-old-tags.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import fs from "fs"
import { TAG_NAMES, isYes } from "../lib/tags"

export default async function importOldTags({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  const byKey = new Map<string, Set<string>>(), byGuid = new Map<string, Set<string>>()
  const add = (m: Map<string, Set<string>>, k: string, t: string) => m.set(k, (m.get(k) || new Set()).add(t))
  // старый сайт
  const exp = JSON.parse(fs.readFileSync("/srv/ohana/shared/export_catalog.json", "utf8"))
  const fid = new Map<string, string>()
  for (const f of exp.features as any[]) if (TAG_NAMES.includes(f.name)) fid.set(String(f.id), f.name)
  for (const p of exp.products as any[]) {
    for (const [id, vals] of Object.entries(p.features || {})) {
      const name = fid.get(id); if (!name) continue
      const v = Array.isArray(vals) ? vals[0] : vals
      if (v && (isYes(v) || String(v).trim() !== "")) { add(byKey, p.group_id ? `g${p.group_id}` : `p${p.id}`, name); if (!p.group_id) add(byKey, `p${p.id}`, name) }
    }
  }
  // текущая выгрузка 1С
  try {
    const xml = fs.readFileSync("/srv/ohana/shared/cml/import0_1.xml", "utf8")
    const propName = new Map<string, string>()
    for (const m of xml.matchAll(/<Свойство>\s*<Ид>([^<]+)<\/Ид>\s*<Наименование>([^<]+)<\/Наименование>/g)) propName.set(m[1], m[2])
    for (const m of xml.matchAll(/<Товар>([\s\S]*?)<\/Товар>/g)) {
      const b = m[1]; const id = (b.match(/<Ид>([^<]+)<\/Ид>/) || [])[1]; if (!id) continue
      for (const pv of b.matchAll(/<ЗначенияСвойства>\s*<Ид>([^<]+)<\/Ид>\s*<Значение>([^<]*)<\/Значение>/g)) {
        const name = propName.get(pv[1]); if (name && TAG_NAMES.includes(name) && isYes(pv[2])) add(byGuid, id.toLowerCase().split("#")[0], name)
      }
    }
  } catch (e: any) { logger.warn(`import0_1.xml не прочитан: ${e?.message || e}`) }
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "metadata"] })
  let n = 0
  for (const p of products) {
    const set = new Set<string>([...(byKey.get(String(p.metadata?.cscart_key || "")) || []), ...(byGuid.get(String(p.metadata?.guid || "").toLowerCase().split("#")[0]) || [])])
    const tags = TAG_NAMES.filter((t) => set.has(t))
    const cur = Array.isArray(p.metadata?.tags) ? (p.metadata!.tags as string[]) : []
    if (tags.join("|") === cur.join("|")) continue
    if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata || {}), tags } } } })
    n++
  }
  logger.info(`теги 1С: со старого сайта ${byKey.size} ключей, из выгрузки ${byGuid.size} номенклатур; обновлено товаров ${n}${dry ? " (dry)" : ""}`)
}
