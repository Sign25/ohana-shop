/**
 * Миграция каталога из CS-Cart (ohanaopt.ru) в Medusa.
 * Вход: JSON, снятый скриптом /root/export_catalog.php на старом сервере.
 *
 *   npx medusa exec ./src/scripts/import-cscart.ts [reset] [limit=N] [file=path]
 *   (medusa exec принимает только позиционные аргументы, флаги с «--» отвергает)
 *
 * Правила отображения:
 *  - группа вариаций CS-Cart (размерный ряд одной модели) → один товар Medusa,
 *    каждая позиция ряда → вариант с опциями «Размер» и «Цвет»;
 *  - одиночный товар без группы → товар с одним вариантом;
 *  - базовая цена (usergroup 0) → цена варианта в RUB; «Крупный опт» (группа 3) →
 *    прайс-лист override для группы клиентов «Крупный опт»; «Акция» (8) → прайс-лист sale;
 *  - остаток → уровень запаса на складе «Оптовый склад Омск»;
 *  - характеристики → metadata товара/варианта (GUID 1С, вложение упаковки, состав, сертификат…);
 *  - фото → https://api.ohanaopt.ru/images/detailed/<путь> (файлы перенесены как есть).
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createCustomerGroupsWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createStockLocationsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"

const IMG_BASE = "https://api.ohanaopt.ru/images/web/" // пережатые копии (≤1400px) из /images/detailed
const ROOT_CATALOG = "456"
const SHOWCASES = new Set(["494", "495", "496", "560"]) // Лето 2026, Big size, Школа, Осень/зима 2027

type Feat = Record<string, string[]>
type CsProduct = {
  id: string; code: string; status: string; amount: string; weight: string
  length: string; width: string; height: string; min_qty: string; qty_step: string
  parent_product_id: string; ohana_pack_unit: string; name: string; description: string
  meta_description: string; page_title: string; slug: string; group_id: string | null; guid: string | null
  categories: { id: number; main: boolean; position: number }[]
  prices: Record<string, number>; features: Feat
  images: { path: string; main: boolean; w: number; h: number }[]
}
type CsCategory = { id: string; parent_id: string; status: string; position: string; name: string; description: string; slug: string; image: string | null }

const f1 = (f: Feat, id: string) => (f[id] && f[id][0] ? String(f[id][0]).trim() : "")
const num = (v: any) => { const n = parseFloat(String(v ?? "").replace(/\s| /g, "").replace(",", ".")); return isNaN(n) ? 0 : n }

function cleanTitle(name: string): string {
  let t = name.replace(/\s+/g, " ").trim()
  t = t.replace(/^\d{4,6}\s+/, "")                             // ведущий артикул
  t = t.replace(/\s*\(\s*(?:цвет|размер)[\s\S]*$/i, "")         // хвост «( Цвет: …, размер 46 …)» — скобки вложенные, режем до конца
  t = t.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
function baseHandle(slug: string, code: string): string {
  let h = (slug || "").toLowerCase()
  h = h.replace(/-cvet-.*$/, "").replace(/-razmer-.*$/, "").replace(/-model-.*$/, "").replace(/(-ru)?(-\d+)?$/, "")
  h = h.replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "")
  if (!h) h = "p-" + code
  return h
}
function sizeKey(f: Feat): string {
  const s = f1(f, "12").split(" ")[0] || f1(f, "45") // «48 164 (96-76-104)» → 48; фича 45 — мультивыбор, у всех размеров первая = младший
  return s.replace(/[^0-9a-zA-Zа-яА-Я]/g, "") || "std"
}
function translit(s: string): string {
  const m: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" }
  return s.toLowerCase().split("").map((c) => m[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export default async function importCscart({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const argv = args || []
  const opt = (k: string) => { const a = argv.find((x) => x.startsWith(k + "=")); return a ? a.slice(k.length + 1) : "" }
  const reset = argv.includes("reset")
  const limit = parseInt(opt("limit")) || 0
  const file = opt("file") || "/srv/ohana/shared/export_catalog.json"

  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  const products: CsProduct[] = data.products.filter((p: CsProduct) => p.status === "A")
  const categories: CsCategory[] = data.categories
  logger.info(`Экспорт от ${data.exported_at}: активных позиций ${products.length}, категорий ${categories.length}`)

  // --- базовые сущности -------------------------------------------------
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const channel = channels.find((c: any) => c.name === "Default Sales Channel") || channels[0]

  let { data: locations } = await query.graph({ entity: "stock_location", fields: ["id", "name"] })
  let location = locations.find((l: any) => l.name === "Оптовый склад Омск")
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Оптовый склад Омск", address: { city: "Омск", country_code: "ru", address_1: "" } }] },
    })
    location = result[0]
    await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [channel.id] } })
    logger.info(`Создан склад ${location.id}`)
  }

  let { data: groups } = await query.graph({ entity: "customer_group", fields: ["id", "name"] })
  let krupny = groups.find((g: any) => g.name === "Крупный опт")
  if (!krupny) {
    const { result } = await createCustomerGroupsWorkflow(container).run({ input: { customersData: [{ name: "Крупный опт", metadata: { cscart_usergroup_id: 3 } }] } })
    krupny = result[0]
    logger.info(`Создана группа клиентов «Крупный опт» ${krupny.id}`)
  }

  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"] })
  const shippingProfile = shippingProfiles.find((p: any) => p.type === "default") || shippingProfiles[0]

  // --- сброс --------------------------------------------------------------
  if (reset) {
    const { data: old } = await query.graph({ entity: "product", fields: ["id"] })
    logger.info(`Сброс: товаров ${old.length}`)
    if (old.length) { await deleteProductsWorkflow(container).run({ input: { ids: old.map((p: any) => p.id) } }); logger.info(`Удалено товаров: ${old.length}`) }
    let { data: oldCats } = await query.graph({ entity: "product_category", fields: ["id", "parent_category_id"] })
    let removed = 0
    while (oldCats.length) { // категорию с детьми удалять нельзя — снимаем дерево с листьев
      const parents = new Set(oldCats.map((c: any) => c.parent_category_id).filter(Boolean))
      const leaves = oldCats.filter((c: any) => !parents.has(c.id))
      await deleteProductCategoriesWorkflow(container).run({ input: leaves.map((c: any) => c.id) })
      removed += leaves.length
      oldCats = oldCats.filter((c: any) => parents.has(c.id))
    }
    if (removed) logger.info(`Удалено категорий: ${removed}`)
    const { data: oldPl } = await query.graph({ entity: "price_list", fields: ["id"] })
    if (oldPl.length) {
      const pricingModule = container.resolve(Modules.PRICING)
      await pricingModule.deletePriceLists(oldPl.map((p: any) => p.id))
      logger.info(`Удалено прайс-листов: ${oldPl.length}`)
    }
  }

  // --- категории ------------------------------------------------------------
  const catById = new Map(categories.map((c) => [c.id, c]))
  const active = categories.filter((c) => c.status === "A" && (c.parent_id === ROOT_CATALOG || SHOWCASES.has(c.id) || (catById.get(c.parent_id)?.status === "A" && catById.get(c.parent_id)?.parent_id === ROOT_CATALOG)))
  const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "handle", "metadata"] })
  const catMap = new Map<string, string>() // cscart id → medusa id
  const catHandle = new Map<string, string>()
  const usedCatHandles = new Set<string>(existingCats.map((c: any) => c.handle))
  for (const c of existingCats) if (c.metadata?.cscart_id) { catMap.set(String(c.metadata.cscart_id), c.id); catHandle.set(String(c.metadata.cscart_id), c.handle) }
  const byDepth = [...active].sort((a, b) => (a.parent_id === ROOT_CATALOG || SHOWCASES.has(a.id) ? 0 : 1) - (b.parent_id === ROOT_CATALOG || SHOWCASES.has(b.id) ? 0 : 1))
  let rank = 0
  for (const c of byDepth) {
    if (catMap.has(c.id)) continue
    const top = c.parent_id === ROOT_CATALOG || SHOWCASES.has(c.id)
    const parentId = top ? null : catMap.get(c.parent_id) || null
    let handle = c.slug || translit(c.name)
    if (usedCatHandles.has(handle)) handle = `${catHandle.get(c.parent_id) || "c"}-${handle}` // одинаковые ЧПУ в разных разделах («Жилеты синтепоновые» у мужчин и женщин)
    if (usedCatHandles.has(handle)) handle = `${handle}-${c.id}`
    usedCatHandles.add(handle); catHandle.set(c.id, handle)
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [{
        name: c.name, handle, is_active: true, is_internal: false, rank: rank++,
        parent_category_id: parentId, description: (c.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
        metadata: { cscart_id: Number(c.id), guid: data.category_guids?.[c.id] || null, kind: SHOWCASES.has(c.id) ? "showcase" : "catalog", image: c.image ? IMG_BASE + c.image : null, position: Number(c.position) },
      }] },
    })
    catMap.set(c.id, result[0].id)
  }
  logger.info(`Категорий в Medusa: ${catMap.size}`)

  // --- группировка товаров --------------------------------------------------
  const byGroup = new Map<string, CsProduct[]>()
  const singles: CsProduct[] = []
  for (const p of products) { if (p.group_id) { if (!byGroup.has(p.group_id)) byGroup.set(p.group_id, []); byGroup.get(p.group_id)!.push(p) } else singles.push(p) }
  let units: CsProduct[][] = [...byGroup.values(), ...singles.map((p) => [p])]
  units.sort((a, b) => Number(a[0].id) - Number(b[0].id))
  if (limit) units = units.slice(0, limit)
  logger.info(`К импорту: ${units.length} товаров (групп ${byGroup.size}, одиночных ${singles.length})`)

  const { data: existingProducts } = await query.graph({ entity: "product", fields: ["id", "handle", "metadata"] })
  const doneGroups = new Set(existingProducts.map((p: any) => String(p.metadata?.cscart_key)))
  const usedHandles = new Set(existingProducts.map((p: any) => p.handle))
  const { data: existingVariants } = await query.graph({ entity: "product_variant", fields: ["sku", "barcode"] })
  const usedSkus = new Set(existingVariants.map((v: any) => v.sku).filter(Boolean))
  const usedBarcodes = new Set(existingVariants.map((v: any) => v.barcode).filter(Boolean))

  const stockRows: { sku: string; qty: number }[] = []
  const krupnyPrices: { sku: string; amount: number }[] = []
  const salePrices: { sku: string; amount: number }[] = []
  let batch: any[] = []
  let created = 0

  const flush = async () => {
    if (!batch.length) return
    const { result } = await createProductsWorkflow(container).run({ input: { products: batch } })
    created += result.length
    logger.info(`Создано товаров: ${created}`)
    batch = []
  }

  for (const unit of units) {
    const main = unit.find((p) => p.parent_product_id === "0") || unit[0]
    const key = main.group_id ? "g" + main.group_id : "p" + main.id
    if (doneGroups.has(key)) continue
    const f = main.features
    const title = cleanTitle(main.name)
    let handle = baseHandle(main.slug, main.code)
    if (usedHandles.has(handle)) { let i = 2; while (usedHandles.has(`${handle}-${i}`)) i++; handle = `${handle}-${i}` }
    usedHandles.add(handle)

    const sizes = [...new Set(unit.map((p) => f1(p.features, "12")).filter(Boolean))]
    const colors = [...new Set(unit.map((p) => f1(p.features, "11")).filter(Boolean))]
    const options: { title: string; values: string[] }[] = []
    if (sizes.length) options.push({ title: "Размер", values: sizes })
    if (colors.length) options.push({ title: "Цвет", values: colors })

    const variants = unit.map((p) => {
      const size = f1(p.features, "12"), color = f1(p.features, "11")
      let sku = `${p.code || "art"}-${sizeKey(p.features)}`
      if (colors.length > 1 && color) sku += "-" + translit(color).slice(0, 12)
      if (usedSkus.has(sku)) sku = `${sku}-${p.id}`
      usedSkus.add(sku)
      const opts: Record<string, string> = {}
      if (sizes.length) opts["Размер"] = size || sizes[0]
      if (colors.length) opts["Цвет"] = color || colors[0]
      const base = Number(p.prices?.["0"] || 0)
      const kr = Number(p.prices?.["3"] || 0), sale = Number(p.prices?.["8"] || 0)
      if (kr && kr < base) krupnyPrices.push({ sku, amount: kr })
      if (sale && sale < base) salePrices.push({ sku, amount: sale })
      stockRows.push({ sku, qty: Math.max(0, parseInt(p.amount) || 0) })
      const packQty = num(f1(p.features, "6")) || null
      // штрихкод в CS-Cart один на модель, а у варианта Medusa он уникален — вешаем на первый размер, остальным в metadata
      const bc = f1(p.features, "4")
      const barcode = bc && !usedBarcodes.has(bc) ? bc : undefined
      if (barcode) usedBarcodes.add(barcode)
      return {
        title: [size, colors.length > 1 ? color : ""].filter(Boolean).join(" / ") || "Стандарт",
        sku, barcode,
        options: opts, manage_inventory: true, allow_backorder: false,
        weight: Math.round(num(p.weight) * 1000) || Math.round(num(f1(p.features, "7"))) || undefined,
        length: num(f1(p.features, "8")) || num(p.length) || undefined,
        width: num(f1(p.features, "9")) || num(p.width) || undefined,
        height: num(f1(p.features, "10")) || num(p.height) || undefined,
        prices: [{ amount: base, currency_code: "rub" }],
        metadata: {
          cscart_id: Number(p.id), guid: p.guid, size, color, size_num: f1(p.features, "45") || null, height_cm: f1(p.features, "29") || null,
          pack_qty: packQty, pack_unit: p.ohana_pack_unit || "N", qty_step: parseInt(p.qty_step) || packQty || 1, min_qty: parseInt(p.min_qty) || packQty || 1,
          price_krupny: kr || null, price_sale: sale || null, old_slug: p.slug, barcode: bc || null,
        },
      }
    })

    const seen = new Set<string>()
    const images: { url: string }[] = []
    for (const p of [main, ...unit]) for (const im of p.images) { if (!seen.has(im.path)) { seen.add(im.path); images.push({ url: IMG_BASE + im.path }) } }

    const catIds = [...new Set(unit.flatMap((p) => p.categories.map((c) => String(c.id))))].map((id) => catMap.get(id)).filter(Boolean) as string[]

    batch.push({
      title, handle, status: ProductStatus.PUBLISHED, description: main.description || "",
      options: options.length ? options : [{ title: "Вариант", values: ["Стандарт"] }],
      variants: options.length ? variants : variants.map((v) => ({ ...v, options: { Вариант: "Стандарт" } })),
      images, thumbnail: images[0]?.url,
      categories: catIds.map((id) => ({ id })), sales_channels: [{ id: channel.id }],
      shipping_profile_id: shippingProfile?.id,
      weight: Math.round(num(main.weight) * 1000) || undefined,
      metadata: {
        cscart_key: key, cscart_group_id: main.group_id, cscart_main_id: Number(main.id), code: main.code,
        guid: (main.guid || "").split("#")[0] || null, old_slug: main.slug,
        model: f1(f, "1") || null, size_range: f1(f, "2") || null, manufacturer: f1(f, "3") || null, composition: f1(f, "5") || f1(f, "21") || null,
        cert_doc: f1(f, "13") || null, cert_issued: f1(f, "14") || null, cert_until: f1(f, "15") || null, cert_org: f1(f, "16") || null,
        color_label: f1(f, "18") || null, category_label: f1(f, "22") || null, foreign_name: f1(f, "17") || null,
        seo_title: main.page_title || null, seo_description: main.meta_description || null,
      },
    })
    if (batch.length >= 25) await flush()
  }
  await flush()

  // --- остатки ---------------------------------------------------------------
  if (stockRows.length) {
    const { data: variants } = await query.graph({ entity: "product_variant", fields: ["id", "sku", "inventory_items.inventory_item_id"], filters: { sku: stockRows.map((r) => r.sku) } })
    const { data: levels } = await query.graph({ entity: "inventory_level", fields: ["inventory_item_id"], filters: { location_id: location.id } })
    const has = new Set(levels.map((l: any) => l.inventory_item_id))
    const itemBySku = new Map(variants.map((v: any) => [v.sku, v.inventory_items?.[0]?.inventory_item_id]))
    const input = stockRows.map((r) => ({ inventory_item_id: itemBySku.get(r.sku), location_id: location.id, stocked_quantity: r.qty })).filter((r) => r.inventory_item_id && !has.has(r.inventory_item_id))
    for (let i = 0; i < input.length; i += 200) await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: input.slice(i, i + 200) } })
    logger.info(`Уровни запаса: ${input.length}`)
  }

  // --- прайс-листы -------------------------------------------------------------
  const allSkus = [...krupnyPrices, ...salePrices].map((r) => r.sku)
  if (allSkus.length) {
    const { data: variants } = await query.graph({ entity: "product_variant", fields: ["id", "sku"], filters: { sku: [...new Set(allSkus)] } })
    const idBySku = new Map(variants.map((v: any) => [v.sku, v.id]))
    const lists: any[] = []
    if (krupnyPrices.length) lists.push({ title: "Крупный опт", description: "Цены группы «Крупный опт» (из CS-Cart, usergroup 3)", type: "override", status: "active", rules: { customer_group_id: [krupny.id] },
      prices: krupnyPrices.filter((r) => idBySku.get(r.sku)).map((r) => ({ amount: r.amount, currency_code: "rub", variant_id: idBySku.get(r.sku) })) })
    if (salePrices.length) lists.push({ title: "Акция", description: "Акционные цены из 1С (usergroup 8)", type: "sale", status: "active",
      prices: salePrices.filter((r) => idBySku.get(r.sku)).map((r) => ({ amount: r.amount, currency_code: "rub", variant_id: idBySku.get(r.sku) })) })
    await createPriceListsWorkflow(container).run({ input: { price_lists_data: lists } })
    logger.info(`Прайс-листы: ${lists.map((l) => `${l.title} (${l.prices.length})`).join(", ")}`)
  }
  logger.info("Импорт завершён")
}
