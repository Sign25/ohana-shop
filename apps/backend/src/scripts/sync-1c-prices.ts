/**
 * Цены из 1С (регистр «Цены номенклатуры 2.5», срез последних) → Medusa.
 *   «Оптовая цена САЙТ»      → базовая цена варианта (RUB)
 *   «Крупнооптовая цена САЙТ» → прайс-лист «Крупный опт» + variant.metadata.price_krupny
 *   «Акционная Цена сайта»   → прайс-лист «Акция» (sale; 0 = акции нет) + metadata.price_sale
 *   «Розничная цена сайта»   → metadata.rrc (на опте не показываем, нужна для СП/розницы)
 * Цены в 1С заданы на номенклатуру (без характеристик) — одна цена на все размеры.
 *
 *   npx medusa exec ./src/scripts/sync-1c-prices.ts [dry] [quiet]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { OnecMcp, SITE_GROUPS_SQL } from "../lib/onec-mcp"

const PT_OPT = "оптовая цена сайт"
const PT_KRUPNY = "крупнооптовая цена сайт"
const PT_PROMO = "акционная цена сайта"
const PT_RETAIL = "розничная цена сайта"

const Q_PRICES =
  "ВЫБРАТЬ Г.Ссылка КАК Гр ПОМЕСТИТЬ ГрТ ИЗ Справочник.Номенклатура КАК Г ГДЕ Г.ЭтоГруппа И" + SITE_GROUPS_SQL +
  " ; ВЫБРАТЬ Н.Ссылка КАК Ном ПОМЕСТИТЬ НТ ИЗ Справочник.Номенклатура КАК Н ГДЕ НЕ Н.ЭтоГруппа И Н.Ссылка В ИЕРАРХИИ (ВЫБРАТЬ Т.Гр ИЗ ГрТ КАК Т)" +
  " ; ВЫБРАТЬ Ц.Номенклатура КАК Ном, Ц.ВидЦены.Наименование КАК Вид, Ц.Цена КАК Цена" +
  " ИЗ РегистрСведений.ЦеныНоменклатуры25.СрезПоследних(, Номенклатура В (ВЫБРАТЬ Т.Ном ИЗ НТ КАК Т)) КАК Ц" +
  ' ГДЕ Ц.ВидЦены.Наименование В ("Оптовая цена САЙТ", "Крупнооптовая цена САЙТ", "Акционная Цена сайта", "Розничная цена сайта")'

export default async function syncPrices({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = container.resolve(Modules.PRICING)
  const dry = (args || []).includes("dry")
  const t0 = Date.now()

  const rows = await new OnecMcp().query(Q_PRICES)
  const prices = new Map<string, { opt?: number; krupny?: number; promo?: number; retail?: number }>()
  for (const r of rows) {
    const nom = String(r["Ном__id"] || "").toLowerCase()
    if (!nom) continue
    const kind = String(r["Вид"] || "").toLowerCase()
    const val = Number(r["Цена"]) || 0
    const p = prices.get(nom) || {}
    if (kind === PT_OPT) p.opt = val
    else if (kind === PT_KRUPNY) p.krupny = val
    else if (kind === PT_PROMO) p.promo = val
    else if (kind === PT_RETAIL) p.retail = val
    prices.set(nom, p)
  }
  logger.info(`1С: цен по ${prices.size} номенклатурам (${((Date.now() - t0) / 1000).toFixed(1)} с)`)

  const { data: lists } = await query.graph({ entity: "price_list", fields: ["id", "title"] })
  const krupnyList = lists.find((l: any) => l.title === "Крупный опт")
  const saleList = lists.find((l: any) => l.title === "Акция")
  if (!krupnyList || !saleList) throw new Error("нет прайс-листов «Крупный опт»/«Акция» — сначала импорт каталога")

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "metadata", "product.metadata", "price_set.id", "price_set.prices.id", "price_set.prices.amount", "price_set.prices.currency_code", "price_set.prices.price_list_id"],
  })
  // цены прайс-листов query.graph через price_set не отдаёт — берём из модуля цен напрямую
  const listPrices = await pricing.listPrices(
    { price_list_id: [krupnyList.id, saleList.id] },
    { select: ["id", "amount", "currency_code", "price_set_id", "price_list_id"], take: null } as any
  )
  const krBySet = new Map<string, any>(), slBySet = new Map<string, any>()
  for (const pr of listPrices as any[]) {
    if (pr.currency_code !== "rub") continue
    if (pr.price_list_id === krupnyList.id) krBySet.set(pr.price_set_id, pr)
    else if (pr.price_list_id === saleList.id) slBySet.set(pr.price_set_id, pr)
  }
  logger.info(`цен в прайс-листах сейчас: крупный опт ${krBySet.size}, акция ${slBySet.size}`)

  let baseUpd = 0, listAdd = 0, listUpd = 0, listDel = 0, metaUpd = 0, noPrice = 0
  const variantUpdates: any[] = []
  const addKr: any[] = [], updKr: any[] = [], addSale: any[] = [], updSale: any[] = [], del: string[] = []
  const examples: string[] = []

  for (const v of variants) {
    const guid = String(v.metadata?.guid || v.product?.metadata?.guid || "").toLowerCase().split("#")[0]
    const p = guid ? prices.get(guid) : undefined
    if (!p || !p.opt) { noPrice++; continue }
    const ps = v.price_set
    if (!ps?.id) continue
    const rub = (ps.prices || []).filter((x: any) => x.currency_code === "rub")
    const base = rub.find((x: any) => !x.price_list_id)
    const kr = krBySet.get(ps.id)
    const sl = slBySet.get(ps.id)

    if (!base || Number(base.amount) !== p.opt) {
      variantUpdates.push({ id: v.id, prices: [{ amount: p.opt, currency_code: "rub" }] })
      baseUpd++
      if (examples.length < 6) examples.push(`${v.sku}: опт ${base?.amount ?? "—"} → ${p.opt}`)
    }
    const wantKr = p.krupny && p.krupny < p.opt ? p.krupny : 0
    if (wantKr) {
      if (!kr) { addKr.push({ amount: wantKr, currency_code: "rub", price_set_id: ps.id }); listAdd++ }
      else if (Number(kr.amount) !== wantKr) { updKr.push({ id: kr.id, amount: wantKr, currency_code: "rub", price_set_id: ps.id }); listUpd++ }
    } else if (kr) { del.push(kr.id); listDel++ }
    const wantSale = p.promo && p.promo < p.opt ? p.promo : 0
    if (wantSale) {
      if (!sl) { addSale.push({ amount: wantSale, currency_code: "rub", price_set_id: ps.id }); listAdd++ }
      else if (Number(sl.amount) !== wantSale) { updSale.push({ id: sl.id, amount: wantSale, currency_code: "rub", price_set_id: ps.id }); listUpd++ }
    } else if (sl) { del.push(sl.id); listDel++ }

    const m = v.metadata || {}
    if (Number(m.price_krupny || 0) !== (wantKr || 0) || Number(m.price_sale || 0) !== (wantSale || 0) || Number(m.rrc || 0) !== (p.retail || 0)) {
      const upd = variantUpdates.find((u) => u.id === v.id) || (variantUpdates.push({ id: v.id }), variantUpdates[variantUpdates.length - 1])
      upd.metadata = { ...m, price_krupny: wantKr || null, price_sale: wantSale || null, rrc: p.retail || null }
      metaUpd++
    }
  }

  logger.info(`вариантов без цены в 1С ${noPrice}; базовых цен к обновлению ${baseUpd}, прайс-листы: +${listAdd} ~${listUpd} −${listDel}; metadata ${metaUpd}${dry ? " (dry)" : ""}`)
  if (examples.length) logger.info("примеры: " + examples.join("; "))
  if (dry) return

  for (let i = 0; i < variantUpdates.length; i += 100) {
    await updateProductVariantsWorkflow(container).run({ input: { product_variants: variantUpdates.slice(i, i + 100) } })
  }
  if (addKr.length) await pricing.addPriceListPrices([{ price_list_id: krupnyList.id, prices: addKr }])
  if (addSale.length) await pricing.addPriceListPrices([{ price_list_id: saleList.id, prices: addSale }])
  if (updKr.length) await pricing.updatePriceListPrices([{ price_list_id: krupnyList.id, prices: updKr }])
  if (updSale.length) await pricing.updatePriceListPrices([{ price_list_id: saleList.id, prices: updSale }])
  if (del.length) await pricing.removePrices(del)
  logger.info(`готово за ${((Date.now() - t0) / 1000).toFixed(1)} с`)
}
