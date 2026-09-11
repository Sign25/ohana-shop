/**
 * Галочка 1С «Блокировать выгрузку на сайт» (регистр БУС_НоменклатураЗаблокированнаяКВыгрузкеНаСайт —
 * типовой обмен её не знает, см. память ohana-1c-site-block-flag). Сторож раз в час: заблокированные → draft
 * + metadata.blocked_1c; снятие галочки возвращает published ТОЛЬКО тем, кого отключил этот скрипт.
 * При ошибке 1С ничего не трогаем.   npx medusa exec ./src/scripts/sync-1c-blocked.ts [dry] [quiet]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { OnecMcp } from "../lib/onec-mcp"

const Q = "ВЫБРАТЬ Б.Номенклатура КАК Ном ИЗ РегистрСведений.БУС_НоменклатураЗаблокированнаяКВыгрузкеНаСайт КАК Б"

export default async function sync1cBlocked({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry"), quiet = (args || []).includes("quiet")
  let rows: Record<string, any>[]
  try { rows = await new OnecMcp().query(Q) } catch (e: any) { logger.warn(`1С недоступна (${e?.message || e}) — блокировки не трогаем`); return }
  const blocked = new Set(rows.map((r) => String(r["Ном__id"] || "").toLowerCase()).filter(Boolean))
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "status", "metadata"] })
  let off = 0, on = 0
  for (const p of products) {
    const guid = String(p.metadata?.guid || "").toLowerCase().split("#")[0]
    const isBlocked = !!guid && blocked.has(guid)
    if (isBlocked && p.status === "published") {
      if (!quiet) logger.info(`блок 1С → draft: ${p.metadata?.code || ""} ${p.title}`)
      if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { status: "draft", metadata: { ...(p.metadata || {}), blocked_1c: true } } } })
      off++
    } else if (!isBlocked && p.status !== "published" && p.metadata?.blocked_1c) {
      if (!quiet) logger.info(`блок снят → published: ${p.metadata?.code || ""} ${p.title}`)
      if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { status: "published", metadata: { ...(p.metadata || {}), blocked_1c: false } } } })
      on++
    }
  }
  logger.info(`блокировка 1С: в регистре ${blocked.size} номенклатур; отключено ${off}, возвращено ${on}${dry ? " (dry)" : ""}`)
}
