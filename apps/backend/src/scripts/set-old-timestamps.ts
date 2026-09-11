/**
 * Даты создания и ручные скрытия со старого сайта (export_catalog.json): у товара, собранного из группы вариаций
 * CS-Cart (metadata.cscart_key = "g<group_id>"), metadata.created_1c = самая ранняя дата вариации — по ней считается
 * «Новинка» (после миграции все created_at = 10.09). Если ВСЕ вариации группы были отключены (status D) и товар
 * не заблокирован 1С — снимаем с витрины (draft + metadata.hidden_old), как было на старом сайте.
 *   npx medusa exec ./src/scripts/set-old-timestamps.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import fs from "fs"

export default async function setOldTimestamps({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  const exp = JSON.parse(fs.readFileSync("/srv/ohana/shared/export_catalog.json", "utf8"))
  const groups = new Map<string, { ts: number; active: boolean }>()
  // cscart_key на сайте: "g<group_id>" у групп вариаций, "p<product_id>" у одиночных товаров
  for (const p of exp.products as any[]) {
    for (const key of [p.group_id ? `g${p.group_id}` : null, `p${p.id}`].filter(Boolean) as string[]) {
      const g = groups.get(key) || { ts: Infinity, active: false }
      g.ts = Math.min(g.ts, Number(p.timestamp) || Infinity)
      if (p.status === "A") g.active = true
      groups.set(key, g)
    }
  }
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "status", "metadata"] })
  let ts = 0, hidden = 0
  for (const p of products) {
    const g = groups.get(String(p.metadata?.cscart_key || ""))
    if (!g) continue
    const meta: Record<string, any> = { ...(p.metadata || {}) }
    let update: any = null
    if (isFinite(g.ts) && Number(meta.created_1c) !== g.ts) { meta.created_1c = g.ts; update = { metadata: meta }; ts++ }
    if (!g.active && p.status === "published" && !meta.blocked_1c) {
      meta.hidden_old = true; update = { ...(update || {}), metadata: meta, status: "draft" }; hidden++
      logger.info(`скрыт на старом сайте → draft: ${meta.code || ""} ${p.title}`)
    }
    if (update && !dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update } })
  }
  logger.info(`даты со старого сайта: ${ts}; скрыто вручную на старом сайте: ${hidden}${dry ? " (dry)" : ""}`)
}
