/**
 * Номенклатура из папки «архив» в 1С (старые карточки, у которых в «Номенклатуре 2026» есть новая с тем же артикулом)
 * снимается с витрины: статус draft + metadata.archived_1c. Список берём из 1С через MCP (Родитель = «архив»),
 * при недоступности 1С — из /srv/ohana/shared/cml/archive_guids.txt. Без двойника артикула товар не трогаем.
 *   npx medusa exec ./src/scripts/unpublish-1c-archive.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { OnecMcp } from "../lib/onec-mcp"

const FILE = "/srv/ohana/shared/cml/archive_guids.txt"
const Q = `ВЫБРАТЬ Н.Ссылка КАК Ссылка ИЗ Справочник.Номенклатура КАК Н ГДЕ Н.Родитель.Наименование = "архив" И НЕ Н.ЭтоГруппа`

export default async function unpublishArchive({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  let guids: string[] = []
  try {
    const rows = await new OnecMcp().query(Q)
    guids = rows.map((r) => String(r["Ссылка__id"] || "").toLowerCase()).filter(Boolean)
    if (guids.length) writeFileSync(FILE, guids.join("\n") + "\n")
  } catch (e: any) {
    logger.warn(`1С недоступна (${e?.message || e}) — берём список архива из файла`)
  }
  if (!guids.length && existsSync(FILE)) guids = readFileSync(FILE, "utf8").split(/\s+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  const archive = new Set(guids)
  if (!archive.size) { logger.warn("список архива пуст — ничего не делаем"); return }

  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "status", "metadata"] })
  const liveByCode = new Map<string, number>()
  for (const p of products) {
    const code = String(p.metadata?.code || "").trim()
    if (p.status === "published" && code && !archive.has(String(p.metadata?.guid || "").toLowerCase())) liveByCode.set(code, (liveByCode.get(code) || 0) + 1)
  }
  let n = 0
  for (const p of products) {
    const code = String(p.metadata?.code || "").trim()
    if (p.status !== "published" || !archive.has(String(p.metadata?.guid || "").toLowerCase()) || !liveByCode.get(code)) continue
    logger.info(`архив → draft: ${code} ${p.title}`)
    if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { status: "draft", metadata: { ...(p.metadata || {}), archived_1c: true } } } })
    n++
  }
  logger.info(`архив 1С: ${archive.size} номенклатур; снято с витрины: ${n}${dry ? " (dry)" : ""}`)
}
