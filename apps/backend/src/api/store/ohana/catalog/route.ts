import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/ohana/catalog — поиск по каталогу с фильтрами, которых нет в штатном /store/products:
 * размер (по ведущему токену размера варианта), диапазон оптовой цены, наличие («любой размер» / «полный ряд»),
 * сортировка по цене. Возвращает id товаров в нужном порядке + фасеты; сами товары витрина берёт штатным API по id.
 *
 * Параметры: category_id (через запятую), q, size (через запятую, ключи размеров), pmin, pmax, stock=any|full|all,
 * sale=1 (акционная цена из 1С), new=1 (новинки — товары моложе NEW_DAYS дней, но не старше запуска нового сайта),
 * order=new|price_asc|price_desc|title, limit, offset. Товары без фото не показываем.
 * Данные читаются одним SQL (query.graph с ценами и остатками по 700 товарам занимает ~10 с, SQL — ~100 мс).
 */

/** ключ размера: «46 164 (92-72-100)» → "46", «110-116 (59-56-64)» → "110-116", «L» → "l» — как в импорте из 1С */
const sizeKey = (size: string) => (size || "").toLowerCase().replace(/\s+/g, " ").trim().split(" ")[0].replace(/см$/, "")
const sizeNum = (k: string) => { const m = k.match(/\d+/); return m ? Number(m[0]) : 10_000 }
const LETTER_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl", "5xl"]
const sizeSort = (a: string, b: string) => {
  const na = sizeNum(a), nb = sizeNum(b)
  if (na !== nb) return na - nb
  return LETTER_ORDER.indexOf(a) - LETTER_ORDER.indexOf(b) || a.localeCompare(b)
}
const list = (v: unknown): string[] => (Array.isArray(v) ? v : typeof v === "string" && v ? v.split(",") : []).map((s) => String(s).trim()).filter(Boolean)

type Row = { id: string; title: string; created_at: Date; size: string | null; price: number | null; stock: number | null; sale: number | null }

/** «Новинка» — как на витрине (lib/util/ohana.ts): после запуска нового сайта и не старше 21 дня */
const NEW_FROM = Date.parse("2026-09-12T00:00:00+03:00"), NEW_DAYS = 21
const isNew = (created: number) => created >= NEW_FROM && Date.now() - created < NEW_DAYS * 86400000

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const qp = req.query as Record<string, any>
  const categoryIds = list(qp.category_id)
  // category_handle — раздел по ЧПУ вместе со всеми потомками (ссылки из подбора размера)
  if (!categoryIds.length && qp.category_handle) {
    const { rows } = await pg.raw(`with recursive t as (select id from product_category where handle = ? and deleted_at is null
      union all select c.id from product_category c join t on c.parent_category_id = t.id where c.deleted_at is null) select id from t`, [String(qp.category_handle)])
    categoryIds.push(...rows.map((r: any) => r.id))
    if (!categoryIds.length) return res.json({ ids: [], count: 0, facets: { sizes: [], price_min: 0, price_max: 0, in_stock: 0, full_row: 0, sale: 0, new: 0 } })
  }
  const q = String(qp.q || "").trim()
  const sizes = new Set(list(qp.size).map((s) => s.toLowerCase()))
  const pmin = Number(qp.pmin) || 0, pmax = Number(qp.pmax) || 0
  const stock = qp.stock === "full" ? "full" : qp.stock === "any" ? "any" : ""
  const onlySale = qp.sale === "1", onlyNew = qp.new === "1"
  const order = ["new", "price_asc", "price_desc", "title"].includes(qp.order) ? qp.order : "new"
  const limit = Math.min(Math.max(Number(qp.limit) || 24, 1), 100), offset = Math.max(Number(qp.offset) || 0, 0)

  const where: string[] = ["p.deleted_at is null", "p.status = 'published'", "p.thumbnail is not null"], binds: any[] = []
  if (categoryIds.length) { where.push("p.id in (select product_id from product_category_product where product_category_id = any(?))"); binds.push(categoryIds) }
  if (q) { where.push("(p.title ilike ? or p.metadata->>'code' ilike ? or p.description ilike ?)"); binds.push(`%${q}%`, `${q}%`, `%${q}%`) }

  const sql = `
    select p.id, p.title, p.created_at, v.metadata->>'size' as size, min(pr.amount)::float as price,
           nullif(v.metadata->>'price_sale', '')::float as sale,
           coalesce(sum(il.stocked_quantity - il.reserved_quantity), 0)::float as stock
    from product p
    join product_variant v on v.product_id = p.id and v.deleted_at is null
    left join product_variant_price_set ps on ps.variant_id = v.id and ps.deleted_at is null
    left join price pr on pr.price_set_id = ps.price_set_id and pr.price_list_id is null and pr.currency_code = 'rub' and pr.deleted_at is null
    left join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null
    left join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null
    where ${where.join(" and ")}
    group by p.id, v.id`
  const { rows } = (await pg.raw(sql, binds)) as { rows: Row[] }

  type P = { id: string; title: string; created: number; minPrice: number; sizesIn: Set<string>; sizesAll: Set<string>; anyStock: boolean; full: boolean; n: number; sale: boolean }
  const byId = new Map<string, P>()
  for (const r of rows) {
    let p = byId.get(r.id)
    if (!p) { p = { id: r.id, title: r.title, created: new Date(r.created_at).getTime(), minPrice: Infinity, sizesIn: new Set(), sizesAll: new Set(), anyStock: false, full: true, n: 0, sale: false }; byId.set(r.id, p) }
    if ((r.sale || 0) > 0) p.sale = true
    const k = sizeKey(r.size || ""), inStock = (r.stock || 0) > 0
    p.n++
    if (k) { p.sizesAll.add(k); if (inStock) p.sizesIn.add(k) }
    if (inStock) p.anyStock = true; else p.full = false
    if (r.price && r.price < p.minPrice) p.minPrice = r.price
  }
  const scope = [...byId.values()]

  // фасеты — по области (раздел/поиск) до применения размер/цена/наличие, чтобы можно было переключаться
  const sizeCount = new Map<string, number>()
  for (const p of scope) for (const k of p.sizesIn) sizeCount.set(k, (sizeCount.get(k) || 0) + 1)
  const prices = scope.map((p) => p.minPrice).filter((x) => isFinite(x))
  const facets = {
    sizes: [...sizeCount.entries()].sort((a, b) => sizeSort(a[0], b[0])).map(([key, count]) => ({ key, count })),
    price_min: prices.length ? Math.min(...prices) : 0,
    price_max: prices.length ? Math.max(...prices) : 0,
    in_stock: scope.filter((p) => p.anyStock).length,
    full_row: scope.filter((p) => p.anyStock && p.full).length,
    sale: scope.filter((p) => p.sale && p.anyStock).length,
    new: scope.filter((p) => isNew(p.created) && p.anyStock).length,
  }

  let hits = scope
  if (sizes.size) hits = hits.filter((p) => [...sizes].some((s) => p.sizesIn.has(s)))
  if (pmin) hits = hits.filter((p) => isFinite(p.minPrice) && p.minPrice >= pmin)
  if (pmax) hits = hits.filter((p) => isFinite(p.minPrice) && p.minPrice <= pmax)
  if (stock === "any") hits = hits.filter((p) => p.anyStock)
  if (stock === "full") hits = hits.filter((p) => p.anyStock && p.full)
  if (onlySale) hits = hits.filter((p) => p.sale)
  if (onlyNew) hits = hits.filter((p) => isNew(p.created))

  const price = (p: P) => (isFinite(p.minPrice) ? p.minPrice : 1e12) // без цены — в конец
  const cmp: Record<string, (a: P, b: P) => number> = {
    new: (a, b) => b.created - a.created,
    price_asc: (a, b) => (price(a) - price(b)) || (b.created - a.created),
    price_desc: (a, b) => (price(b) - price(a)) || (b.created - a.created),
    title: (a, b) => a.title.localeCompare(b.title, "ru"),
  }
  hits.sort(cmp[order])
  // товары без остатка — в конец при любой сортировке, чтобы витрина не начиналась с «всё разобрали»
  hits = [...hits.filter((p) => p.anyStock), ...hits.filter((p) => !p.anyStock)]

  res.json({ ids: hits.slice(offset, offset + limit).map((p) => p.id), count: hits.length, facets })
}
