/**
 * Порядок сезонной витрины «Осень/зима 2027» со старого сайта (позиции в категории 560, проставлены
 * по формуле «сезонность → размерный ряд → запас → продажи») → product.metadata.showcase_rank["osen-zima-2027"].
 * Файл /srv/ohana/shared/wb/season560.tsv (артикул, позиция).   npx medusa exec ./src/scripts/import-showcase-rank.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import fs from "fs"

export default async function importShowcaseRank({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const HANDLE = "osen-zima-2027"
  const rank = new Map<string, number>()
  for (const l of fs.readFileSync("/srv/ohana/shared/wb/season560.tsv", "utf8").split("\n")) { const [code, pos] = l.split("\t"); if (code && pos) rank.set(code.trim(), Number(pos)) }
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "metadata"] })
  let n = 0
  for (const p of products) {
    const r = rank.get(String(p.metadata?.code || ""))
    if (r === undefined) continue
    const cur = (p.metadata?.showcase_rank as any) || {}
    if (cur[HANDLE] === r) continue
    await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata || {}), showcase_rank: { ...cur, [HANDLE]: r } } } } })
    n++
  }
  logger.info(`порядок витрины ${HANDLE}: позиций в файле ${rank.size}, обновлено товаров ${n}`)
}
