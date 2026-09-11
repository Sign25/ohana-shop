/**
 * «Хиты (ручной отбор)» — служебная (неактивная) категория, которой менеджер управляет в админке.
 * Скрипт переносит членство в product.metadata.hit_manual (по нему считаются бейдж «Хит» и страница хитов).
 * При первом запуске создаёт категорию и заполняет её из /srv/ohana/shared/wb/manual_hits.txt (артикулы со старого сайта).
 *   npx medusa exec ./src/scripts/sync-manual-hits.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import fs from "fs"

export const MANUAL_HITS_HANDLE = "hity-ruchnoy-otbor"

export default async function syncManualHits({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productService = container.resolve(Modules.PRODUCT)
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "status", "metadata", "categories.id", "categories.handle"] })
  let cat = (await productService.listProductCategories({ handle: MANUAL_HITS_HANDLE }))[0]
  if (!cat) {
    cat = await productService.createProductCategories({ name: "Хиты (ручной отбор)", handle: MANUAL_HITS_HANDLE, is_active: false, is_internal: true, metadata: { kind: "manual-hits", note: "Товары из этой категории получают бейдж «Хит» и попадают на страницу хитов. Категория служебная, на витрине не показывается." } })
    const codes = new Set(fs.existsSync("/srv/ohana/shared/wb/manual_hits.txt") ? fs.readFileSync("/srv/ohana/shared/wb/manual_hits.txt", "utf8").split(/\s+/).filter(Boolean) : [])
    const ids = products.filter((p) => codes.has(String(p.metadata?.code || ""))).map((p) => p.id)
    for (const id of ids) await updateProductsWorkflow(container).run({ input: { selector: { id }, update: { category_ids: [...new Set([...(products.find((p) => p.id === id)?.categories || []).map((c: any) => c.id), cat.id])] } } })
    logger.info(`создана категория «Хиты (ручной отбор)», добавлено товаров: ${ids.length} из ${codes.size} артикулов`)
  }
  const { data: fresh } = await query.graph({ entity: "product", fields: ["id", "metadata", "categories.id"] })
  let set = 0, cleared = 0
  for (const p of fresh) {
    const inCat = (p.categories || []).some((c: any) => c.id === cat.id)
    const cur = !!p.metadata?.hit_manual
    if (inCat === cur) continue
    await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata || {}), hit_manual: inCat } } } })
    inCat ? set++ : cleared++
  }
  logger.info(`ручные хиты: отмечено ${set}, снято ${cleared}`)
}
