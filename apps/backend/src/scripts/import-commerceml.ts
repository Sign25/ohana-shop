/**
 * Импорт каталога из выгрузки 1С (CommerceML import*.xml): новые товары и размеры, описания,
 * характеристики, фото, категории. Цены и остатки этот скрипт не трогает — их ведут
 * sync-1c-prices.ts и sync-1c-stock.ts (запускать после импорта, чтобы новые размеры получили цену).
 *
 * Файлы: /srv/ohana/shared/cml/import0_1.xml + import_files/… (rsync с /root/cml_keep старого сайта,
 * куда их складывает сторож cml_keep.sh после каждого обмена). Веб-копии фото готовит resize-cml.mjs
 * в /srv/ohana/shared/images/web/cml/… — импорт ссылается на них.
 *
 *   npx medusa exec ./src/scripts/import-commerceml.ts [dry] [file=/path/import.xml] [limit=N]
 */
import { TAG_NAMES, isYes } from "../lib/tags"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductVariantsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import { LINEIKA_CATALOG, LINEIKA_GROUP, setVariant, unitGrams, cleanTitle as cleanTitleShared } from "../lib/lineika"
import * as path from "path"

const CML_DIR = "/srv/ohana/shared/cml"
const WEB_DIR = "/srv/ohana/shared/images/web/cml"
const IMG_BASE = "https://api.ohanaopt.ru/images/web/cml/"
const SITE_GROUPS = new Set(["Сайт ОПТ+РОЗН", "Номенклатура 2026"])

// --- разбор XML (файл плоский и предсказуемый, полноценный парсер не нужен) ---
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
const tag = (block: string, name: string) => { const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? unesc(m[1]).trim() : "" }
const tags = (block: string, name: string) => Array.from(block.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))).map((m) => unesc(m[1]).trim())
const blocks = (xml: string, name: string) => Array.from(xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))).map((m) => m[1])

type CmlItem = {
  id: string; nom: string; char: string; article: string; name: string; desc: string; groups: string[]
  images: string[]; props: Record<string, string>; color: string; size: string
  qty: number; hasChar: boolean
}
/** ключ размера для сравнения: «46 164 (92-72-100)» ≈ «46 (164-72-100)» ≈ «46» → "46"; «L» → "l»; «46-54» → "46-54" */
const sizeKey = (size: string) => (size || "").toLowerCase().replace(/\s+/g, " ").trim().split(" ")[0].replace(/см$/, "")

const cleanTitle = cleanTitleShared
function translit(s: string): string {
  const m: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" }
  return s.toLowerCase().split("").map((c) => m[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
const num = (v: any) => { const n = parseFloat(String(v ?? "").replace(/\s| /g, "").replace(",", ".")); return isNaN(n) ? 0 : n }
const webRel = (rel: string) => rel.replace(/^import_files\//, "").replace(/\.png$/i, ".jpg") // веб-копии PNG хранятся как JPEG
const webUrl = (rel: string) => IMG_BASE + webRel(rel)

export default async function importCml({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const argv = args || []
  const opt = (k: string) => { const a = argv.find((x) => x.startsWith(k + "=")); return a ? a.slice(k.length + 1) : "" }
  const dry = argv.includes("dry")
  const limit = parseInt(opt("limit")) || 0
  const file = opt("file") || path.join(CML_DIR, "import0_1.xml")
  const t0 = Date.now()

  const xml = fs.readFileSync(file, "utf8")
  // offers*.xml лежит рядом: остаток и реквизиты характеристики (Цвет/Размер). Характеристики без реквизитов —
  // старые дубли, которые типовой обмен 1С отбрасывал (invalid_features_count); при наличии оформленных — пропускаем их.
  const offerFile = fs.readdirSync(path.dirname(file)).filter((f) => /^offers.*\.xml$/.test(f)).map((f) => path.join(path.dirname(file), f)).sort().pop()
  const offers = new Map<string, { qty: number; color: string; size: string; hasChar: boolean; pack: boolean }>()
  if (offerFile) {
    for (const b of blocks(fs.readFileSync(offerFile, "utf8"), "Предложение")) {
      const id = tag(b, "Ид").toLowerCase(); if (!id) continue
      const ch: Record<string, string> = {}
      for (const c of blocks(b, "ХарактеристикаТовара")) ch[tag(c, "Наименование")] = tag(c, "Значение")
      const unit = b.match(/<БазоваяЕдиница[^>]*Код="\s*(\d+)[^>]*НаименованиеПолное="([^"]*)"/)
      const pack = !!unit && (unit[1] === "778" || /упаков/i.test(unit[2]))
      offers.set(id, { qty: num(tag(b, "Количество")), color: ch["Цвет"] || "", size: ch["Размер"] || "", hasChar: !!(ch["Цвет"] || ch["Размер"]), pack })
    }
    logger.info(`offers: ${path.basename(offerFile)}, предложений ${offers.size}`)
  } else logger.warn("offers*.xml не найден — остатки и реквизиты характеристик недоступны, фильтр дублей отключён")

  // --- классификатор: свойства (Ид → имя, справочник значений) и группы ---
  const propName = new Map<string, string>(), propDict = new Map<string, string>()
  for (const b of blocks(xml, "Свойство")) {
    propName.set(tag(b, "Ид"), tag(b, "Наименование"))
    for (const d of blocks(b, "Справочник")) propDict.set(tag(d, "ИдЗначения"), tag(d, "Значение"))
  }
  // группы: дерево вложенных <Группа>; строим по порядку появления, родитель = ближайшая незакрытая
  const groupName = new Map<string, string>(), groupParent = new Map<string, string | null>()
  {
    const cls = xml.slice(0, xml.indexOf("<Каталог"))
    const re = /<Группа>|<\/Группа>|<Ид>([^<]+)<\/Ид>\s*<Наименование>([^<]+)<\/Наименование>/g
    const stack: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(cls))) {
      if (m[0] === "<Группа>") stack.push("")
      else if (m[0] === "</Группа>") stack.pop()
      else if (stack.length) {
        const id = m[1], name = unesc(m[2]).trim()
        groupName.set(id, name)
        groupParent.set(id, stack.length >= 2 ? stack[stack.length - 2] : null)
        stack[stack.length - 1] = id
      }
    }
  }
  const groupPath = (id: string): string[] => { const p: string[] = []; let c: string | null | undefined = id; while (c) { p.unshift(groupName.get(c) || "?"); c = groupParent.get(c) } return p }
  const inSite = (id: string) => groupPath(id).some((n) => SITE_GROUPS.has(n.trim()))
  // «Номенклатура 2026»: продажа только комплектами — по Ид каталога выгрузки или по группе
  const catalogId = (xml.match(/<Каталог>\s*<Ид>([^<]+)<\/Ид>/) || [])[1]?.trim().toLowerCase() || ""
  const isLineikaGroup = (id: string) => groupPath(id).some((n) => n.trim() === LINEIKA_GROUP)
  const fileIsLineika = catalogId === LINEIKA_CATALOG
  logger.info(`каталог выгрузки: ${catalogId}${fileIsLineika ? " (Номенклатура 2026 — комплекты)" : ""}`)
  logger.info(`классификатор: свойств ${propName.size}, групп ${groupName.size}`)

  // --- товары ---
  const items: CmlItem[] = []
  for (const b of blocks(xml, "Товар")) {
    const id = tag(b, "Ид"); if (!id) continue
    const [nom, char = ""] = id.split("#")
    const props: Record<string, string> = {}
    for (const pv of blocks(b, "ЗначенияСвойства")) {
      const pid = tag(pv, "Ид"), name = propName.get(pid) || pid
      let val = tag(pv, "Значение")
      if (propDict.has(val)) val = propDict.get(val)!
      if (val) props[name] = val
    }
    const name = tag(b, "Наименование")
    // хвост «(Цвет …, размер …)» или «(размер …)»; цвет может отсутствовать
    let suffix = name.match(/\(\s*(?:x?цвет:?\s*([\s\S]*?),\s*)?размер:?\s+([\s\S]*?)\)\s*$/i)
    // формат «Номенклатуры 2026»: «71006 "BIG" Футболка … (58)» или «(44-50)» — размер/линейка в скобках без слова «размер»
    if (!suffix) { const m = name.match(/\(\s*(\d{2,3}(?:\s*-\s*\d{2,3})?(?:\s*\/\s*\d{2,3})?\s*(?:см)?|[XSMLxsml]{1,4}|\dXL)\s*\)\s*$/); if (m) suffix = [m[0], "", m[1].replace(/\s+/g, "")] as any }
    const off = offers.get(id.toLowerCase())
    items.push({
      id: id.toLowerCase(), nom: nom.toLowerCase(), char: char.toLowerCase(), article: tag(b, "Артикул"), name, desc: tag(b, "Описание"),
      groups: tags(tag(b, "Группы") ? (b.match(/<Группы>([\s\S]*?)<\/Группы>/)?.[1] || "") : "", "Ид"),
      images: tags(b, "Картинка"), props,
      color: (off?.color || props["Цвет"] || (suffix && suffix[1]) || "").replace(/\s*\([a-z ,'-]+\)\s*$/i, "").trim(),
      size: (off?.size || (suffix && suffix[2]) || "").trim(),
      qty: off?.qty ?? -1, hasChar: off ? off.hasChar : true,
    })
  }
  const byNom = new Map<string, CmlItem[]>()
  for (const it of items) { if (!byNom.has(it.nom)) byNom.set(it.nom, []); byNom.get(it.nom)!.push(it) }
  let dupSkipped = 0
  for (const [nom, group] of byNom) {
    if (group.length < 2) continue
    // 1) если в номенклатуре есть оформленные характеристики — неоформленные отбрасываем
    let g = group.some((i) => i.hasChar) ? group.filter((i) => i.hasChar) : group
    // 2) одинаковые размер+цвет: оставляем с остатком, затем с более полным именем
    const best = new Map<string, CmlItem>()
    for (const i of g) {
      const k = `${sizeKey(i.size)}|${i.color.toLowerCase()}`
      const cur = best.get(k)
      if (!cur || (i.qty > 0 && cur.qty <= 0) || (i.qty > 0 === cur.qty > 0 && i.size.length > cur.size.length)) best.set(k, i)
    }
    g = g.filter((i) => best.get(`${sizeKey(i.size)}|${i.color.toLowerCase()}`) === i)
    dupSkipped += group.length - g.length
    byNom.set(nom, g)
  }
  if (dupSkipped) logger.info(`пропущено дублей характеристик: ${dupSkipped}`)
  logger.info(`товаров в выгрузке ${items.length} (номенклатур ${byNom.size})`)

  // --- что уже есть на сайте ---
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "handle", "title", "description", "thumbnail", "metadata", "images.id", "images.url", "options.id", "options.title", "options.values.value", "variants.id", "variants.sku", "variants.metadata", "variants.options.value", "variants.options.option_id", "categories.id"] })
  const prodByGuid = new Map<string, any>()
  for (const p of products) { const g = String(p.metadata?.guid || "").toLowerCase(); if (g) prodByGuid.set(g, p) }
  const varByGuid = new Map<string, any>()
  for (const p of products) for (const v of p.variants || []) { const g = String(v.metadata?.guid || "").toLowerCase(); if (g) varByGuid.set(g, { ...v, product: p }) }
  const usedHandles = new Set(products.map((p: any) => p.handle)), usedSkus = new Set<string>()
  for (const p of products) for (const v of p.variants || []) if (v.sku) usedSkus.add(v.sku)

  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "name", "handle", "parent_category_id", "metadata"] })
  const catByGuid = new Map<string, any>(), catHandles = new Set(cats.map((c: any) => c.handle))
  for (const c of cats) { const g = String(c.metadata?.guid || "").toLowerCase(); if (g) catByGuid.set(g, c) }
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const channel = channels.find((c: any) => c.name === "Default Sales Channel") || channels[0]
  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "type"] })
  const shippingProfile = shippingProfiles.find((p: any) => p.type === "default") || shippingProfiles[0]

  // категория для группы 1С: есть по GUID — берём; нет — создаём под родителем (если родитель на сайте)
  const ensureCategory = async (gid: string): Promise<string | null> => {
    const g = gid.toLowerCase()
    if (catByGuid.has(g)) return catByGuid.get(g).id
    if (!groupName.has(gid) || !inSite(gid)) return null
    const name = groupName.get(gid)!.trim()
    if (SITE_GROUPS.has(name) || name === "Интернет склад") return null
    const parentGid = groupParent.get(gid)
    const parentName = parentGid ? groupName.get(parentGid)?.trim() : ""
    const parentId = parentGid && !SITE_GROUPS.has(parentName || "") ? await ensureCategory(parentGid) : null
    // у 1С бывает второе дерево групп с теми же названиями (старые GUID): совпадение по имени и родителю —
    // это та же категория, дубль не создаём (11.09 так появились вторые «Мужская одежда» и «Домашний текстиль»)
    const norm = (x: string) => x.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim()
    const same = cats.find((c: any) => norm(c.name) === norm(name) && (c.parent_category_id || null) === (parentId === "dry" ? c.parent_category_id : parentId))
    if (same) { catByGuid.set(g, same); return same.id }
    let handle = translit(name); if (catHandles.has(handle)) handle = `${handle}-${g.slice(0, 8)}`
    catHandles.add(handle)
    if (dry) { logger.info(`[dry] новая категория «${name}» (${groupPath(gid).join(" › ")})`); catByGuid.set(g, { id: "dry" }); return "dry" }
    const { result } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name, handle, is_active: true, parent_category_id: parentId, metadata: { guid: gid, kind: "catalog", source: "1c" } }] } })
    catByGuid.set(g, result[0]); logger.info(`создана категория «${name}»`)
    return result[0].id
  }

  const stat = { newProducts: 0, newVariants: 0, updated: 0, imagesAdded: 0, skippedOutOfSite: 0, errors: 0 }
  const imgOk = (rel: string) => fs.existsSync(path.join(WEB_DIR, webRel(rel)))
  // промо-карточки («лауреат премий» и т.п.) 1С прикладывает к десяткам номенклатур одной и той же картинкой:
  // считаем md5 веб-копий, картинка из ≥3 разных номенклатур — общая, главным фото не становится, к существующим не добавляется
  const crypto = require("crypto") as typeof import("crypto")
  const imgHash = new Map<string, string>(), hashNoms = new Map<string, Set<string>>()
  for (const it of items) for (const im of it.images) {
    const rel = webRel(im); if (imgHash.has(rel)) { hashNoms.get(imgHash.get(rel)!)?.add(it.nom); continue }
    const f = path.join(WEB_DIR, rel); if (!fs.existsSync(f)) continue
    const h = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex"); imgHash.set(rel, h)
    if (!hashNoms.has(h)) hashNoms.set(h, new Set()); hashNoms.get(h)!.add(it.nom)
  }
  const isShared = (im: string) => { const h = imgHash.get(webRel(im)); return !!h && (hashNoms.get(h)?.size || 0) >= 3 }
  logger.info(`общих промо-картинок: ${[...hashNoms.values()].filter((s) => s.size >= 3).length}`)
  let processed = 0

  for (const [nom, group] of byNom) {
    try {
      if (limit && processed >= limit) break
      const main = group[0]
      if (!main.groups.some((g) => inSite(g))) { stat.skippedOutOfSite++; continue }
      processed++
      const f = main.props
      const packQty = num(f["Количество товаров в упаковке"]) || null
      const tags = TAG_NAMES.filter((t) => isYes(it.props[t]))
      const specMeta = {
        tags,
        code: main.article || null, guid: nom, model: f["Модель"] || null, size_range: f["Размерная линейка"] || null,
        manufacturer: f["Изготовитель"] || null, composition: f["Состав"] || null, color_label: f["Цвет"] || null,
        cert_doc: f["Документ соответствия"] || null, cert_issued: f["Дата выдачи"] || null, cert_until: f["Дата окончания действия"] || null,
        cert_org: f["Орган сертификации"] || null, foreign_name: f["Наименование иностранное"] || null, label_name: f["Наименование для этикетки"] || null,
      }
      const isLineika = fileIsLineika || group.some((i) => i.groups.some(isLineikaGroup))
      const packFromOffers = group.some((i) => offers.get(i.id.toLowerCase())?.pack)
      const catIds = (await Promise.all([...new Set(group.flatMap((i) => i.groups))].map(ensureCategory))).filter(Boolean) as string[]
      // фото: объединяем по всем размерам, без дублей, первое у первой позиции = главное; только те, что уже пережаты
      const seen = new Set<string>(); const imgs: string[] = []
      const sharedImgs: string[] = []
      for (const it of group) for (const im of it.images) { const rel = im.replace(/^import_files\//, ""); if (!seen.has(rel) && imgOk(im)) { seen.add(rel); (isShared(im) ? sharedImgs : imgs).push(webUrl(im)) } }
      imgs.push(...sharedImgs)
      const title = cleanTitle(main.name)
      const description = group.map((i) => i.desc).sort((a, b) => b.length - a.length)[0] || ""

      const makeVariant = (it: CmlItem, sizes: string[], colors: string[]) => {
        const sizeKey = (it.size.split(" ")[0] || "std").replace(/[^0-9a-zA-Zа-яА-Я]/g, "")
        let sku = `${it.article || "art"}-${sizeKey}`; if (colors.length > 1 && it.color) sku += "-" + translit(it.color).slice(0, 12)
        if (usedSkus.has(sku)) sku = `${sku}-${(it.char || it.nom).slice(0, 6)}` // без характеристики — по GUID номенклатуры
      if (usedSkus.has(sku)) sku = `${sku}-${Date.now().toString(36).slice(-4)}`
      usedSkus.add(sku)
        const opts: Record<string, string> = {}
        if (sizes.length) opts["Размер"] = it.size || sizes[0]
        if (colors.length) opts["Цвет"] = it.color || colors[0]
        const w = unitGrams(num(it.props["Вес"]), packQty, "N") || undefined
        return {
          title: [it.size, colors.length > 1 ? it.color : ""].filter(Boolean).join(" / ") || "Стандарт",
          sku, barcode: undefined as string | undefined, options: Object.keys(opts).length ? opts : { Вариант: "Стандарт" }, manage_inventory: true, allow_backorder: false,
          weight: w, length: num(it.props["Длина"]) || undefined, width: num(it.props["Ширина"]) || undefined, height: num(it.props["Высота"]) || undefined,
          metadata: { guid: it.id, size: it.size, color: it.color, pack_qty: packQty, pack_unit: "N", qty_step: packQty || 1, min_qty: packQty || 1, barcode: it.props["Баркод для оптовиков"] || null, source: "1c" },
        }
      }

      const existing = prodByGuid.get(nom)
      if (!existing) {
        // --- новый товар ---
        const sizes = [...new Set(group.map((i) => it_size(i)).filter(Boolean))], colors = [...new Set(group.map((i) => i.color).filter(Boolean))]
        let handle = translit(`${main.article} ${title}`) || `p-${nom.slice(0, 8)}`
        if (usedHandles.has(handle)) handle = `${handle}-${nom.slice(0, 6)}`; usedHandles.add(handle)
        const options: { title: string; values: string[] }[] = []
        if (sizes.length) options.push({ title: "Размер", values: sizes }); if (colors.length) options.push({ title: "Цвет", values: colors })
        let variants: any[] = group.map((it) => makeVariant(it, sizes, colors))
        if (isLineika) {
          // комплект: один вариант на номенклатуру, размер = размерная линейка, шаг = штук в комплекте
          options.length = 0; options.push({ title: "Размер", values: [f["Размерная линейка"] || "Комплект"] })
          const packUnit = packFromOffers ? "Y" : "N"
          const w = unitGrams(num(f["Вес"]), packQty, packUnit)
          variants = [setVariant({ article: main.article, nom, sizeRange: f["Размерная линейка"], color: f["Цвет"], setQty: packQty || 1, packUnit, weight: w || undefined, barcode: f["Баркод для оптовиков"], length: num(f["Длина"]) || undefined, width: num(f["Ширина"]) || undefined, height: num(f["Высота"]) || undefined })]
          ;(specMeta as any).lineika = packUnit === "N"; (specMeta as any).pack = packUnit !== "N"; (specMeta as any).set_qty = packQty || 1
        }
        stat.newProducts++; stat.newVariants += variants.length
        if (dry) { logger.info(`[dry] новый товар «${title}» (${main.article}): ${variants.length} разм., фото ${imgs.length}, категорий ${catIds.length}`); continue }
        await createProductsWorkflow(container).run({ input: { products: [{
          title, handle, status: ProductStatus.PUBLISHED, description,
          options: options.length ? options : [{ title: "Вариант", values: ["Стандарт"] }], variants,
          images: imgs.map((url) => ({ url })), thumbnail: imgs[0], categories: catIds.map((id) => ({ id })), sales_channels: [{ id: channel.id }],
          shipping_profile_id: shippingProfile?.id, metadata: { ...specMeta, cscart_key: null },
        }] } })
        logger.info(`новый товар «${title}» (${main.article}): ${variants.length} разм.`)
        continue
      }

      // --- существующий товар: описание, фото, характеристики, новые размеры ---
      const upd: any = {}
      if (description && description.length > (existing.description || "").length + 20) upd.description = description
      const have = new Set((existing.images || []).map((im: any) => path.basename(im.url)))
      const add = imgs.filter((u) => !have.has(path.basename(u)) && !sharedImgs.includes(u))
      if (add.length) { upd.images = [...(existing.images || []).map((im: any) => ({ url: im.url })), ...add.map((url) => ({ url }))]; stat.imagesAdded += add.length; if (!existing.thumbnail) upd.thumbnail = upd.images[0].url }
      const m = existing.metadata || {}
      const metaChanged = Object.entries(specMeta).some(([k, v]) => v && String(m[k] ?? "") !== String(v))
      if (metaChanged) upd.metadata = { ...m, ...Object.fromEntries(Object.entries(specMeta).filter(([, v]) => v)) }
      const newCats = catIds.filter((id) => !(existing.categories || []).some((c: any) => c.id === id))
      if (newCats.length) upd.categories = [...(existing.categories || []).map((c: any) => ({ id: c.id })), ...newCats.map((id) => ({ id }))]

      // новый размер = нет варианта ни с таким GUID, ни с таким же размером/цветом (у карточек, склеенных из двух
      // номенклатур 1С — «Сайт ОПТ+РОЗН» и «Номенклатура 2026», — GUID вариантов из другой номенклатуры)
      // Сравниваем по ключу размера (у CS-Cart-вариантов формат «46 164 (92-72-100)», у 1С бывает «46 (164-72-100)»);
      // цвет учитываем, только если у товара несколько цветов. Новые размеры добавляем лишь при остатке > 0 —
      // старые характеристики без остатка на витрине не нужны, появится остаток — доедут ночным импортом.
      const exColors = new Set((existing.variants || []).map((v: any) => String(v.metadata?.color || "").toLowerCase()).filter(Boolean))
      const multiColor = exColors.size > 1 || new Set(group.map((i) => i.color.toLowerCase()).filter(Boolean)).size > 1
      const key = (size: string, color: string) => multiColor ? `${sizeKey(size)}|${(color || "").toLowerCase()}` : sizeKey(size)
      const haveSC = new Set((existing.variants || []).map((v: any) => key(v.metadata?.size, v.metadata?.color)))
      // точное совпадение размера и цвета (значения опций) — такой вариант Medusa всё равно не даст создать
      const norm = (x: any) => String(x || "").toLowerCase().replace(/\s+/g, " ").trim()
      const haveExact = new Set((existing.variants || []).map((v: any) => `${norm(v.metadata?.size)}|${norm(v.metadata?.color)}`))
      const haveSize = new Set((existing.variants || []).map((v: any) => norm(v.metadata?.size)))
      const colorOptExists = !!existing.options?.find((o: any) => o.title === "Цвет")
      // номенклатура без характеристик (Ид без «#», размера нет): у товара уже есть вариант — добавлять нечего
      const existingIsSet = !!(existing.metadata?.lineika || existing.metadata?.pack || isLineika)
      const missing = existingIsSet ? [] : group.filter((it) => !varByGuid.has(it.id) && (it.size || !(existing.variants || []).length) && !haveSC.has(key(it.size, it.color)) && !haveExact.has(`${norm(it.size)}|${norm(it.color)}`) && (colorOptExists || !haveSize.has(norm(it.size))) && (it.qty > 0 || !offerFile))
      if (Object.keys(upd).length) {
        stat.updated++
        if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: existing.id }, update: upd } })
      }
      if (missing.length) {
        const sizeOpt = existing.options?.find((o: any) => o.title === "Размер"), colorOpt = existing.options?.find((o: any) => o.title === "Цвет")
        const sizes = sizeOpt ? sizeOpt.values.map((v: any) => v.value) : [], colors = colorOpt ? colorOpt.values.map((v: any) => v.value) : []
        const variants = missing.map((it) => makeVariant(it, sizes.length ? [...sizes, it.size] : [], colors.length ? [...colors, it.color] : [])).map((v) => ({ ...v, product_id: existing.id }))
        stat.newVariants += variants.length
        if (dry) logger.info(`[dry] «${existing.title}»: новые размеры ${missing.map((i) => `${i.size || i.char.slice(0, 8)}(${i.qty})`).join(", ")}`)
        else {
          // новые значения опций у существующего товара: добавить в опцию через updateProducts
          const optUpd: any[] = []
          if (sizeOpt) { const vals = new Set(sizes); missing.forEach((i) => i.size && vals.add(i.size)); if (vals.size !== sizes.length) optUpd.push({ id: sizeOpt.id, title: "Размер", values: [...vals] }) }
          if (colorOpt) { const vals = new Set(colors); missing.forEach((i) => i.color && vals.add(i.color)); if (vals.size !== colors.length) optUpd.push({ id: colorOpt.id, title: "Цвет", values: [...vals] }) }
          if (optUpd.length) await updateProductsWorkflow(container).run({ input: { selector: { id: existing.id }, update: { options: optUpd } } })
          await createProductVariantsWorkflow(container).run({ input: { product_variants: variants } })
          logger.info(`«${existing.title}»: добавлены размеры ${missing.map((i) => i.size).join(", ")}`)
        }
      }
    } catch (e: any) {
      stat.errors++
      logger.error(`ошибка на «${group[0]?.name}» (арт. ${group[0]?.article}): ${e?.message || e}`)
    }
  }

  logger.info(`итог${dry ? " (dry)" : ""}: новых товаров ${stat.newProducts}, новых размеров ${stat.newVariants}, обновлено товаров ${stat.updated}, добавлено фото ${stat.imagesAdded}, вне области сайта ${stat.skippedOutOfSite}, ошибок ${stat.errors}; ${((Date.now() - t0) / 1000).toFixed(1)} с`)
}

function it_size(i: CmlItem) { return i.size }
