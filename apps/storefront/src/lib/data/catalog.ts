"use server"

import { sdk } from "@/lib/config"

export type CatalogFilters = {
  size?: string[]
  pmin?: number
  pmax?: number
  /** "" — все товары (в адресе stock=all); по умолчанию показываем только в наличии */
  stock?: "any" | "full" | ""
  sale?: boolean
  new?: boolean
  hits?: boolean
}
export type CatalogOrder = "new" | "hits" | "position" | "price_asc" | "price_desc" | "title"
export type CatalogFacets = {
  sizes: { key: string; count: number }[]
  price_min: number
  price_max: number
  in_stock: number
  full_row: number
  sale: number
  new: number
  hits: number
}

/** Поиск по каталогу с фильтрами (наш маршрут /store/ohana/catalog): id товаров в нужном порядке + фасеты */
export const searchCatalog = async (params: {
  categoryIds?: string[]
  q?: string
  filters?: CatalogFilters
  order?: CatalogOrder
  /** витрина с ручным порядком (order=position): handle категории для metadata.showcase_rank */
  rankHandle?: string
  limit: number
  offset: number
}): Promise<{ ids: string[]; count: number; facets: CatalogFacets }> => {
  const f = params.filters || {}
  const query: Record<string, string | number> = { limit: params.limit, offset: params.offset, order: params.order || "title" }
  if (params.rankHandle) query.rank_handle = params.rankHandle
  if (params.categoryIds?.length) query.category_id = params.categoryIds.join(",")
  if (params.q) query.q = params.q
  if (f.size?.length) query.size = f.size.join(",")
  if (f.pmin) query.pmin = f.pmin
  if (f.pmax) query.pmax = f.pmax
  if (f.stock) query.stock = f.stock
  if (f.sale) query.sale = 1
  if (f.new) query.new = 1
  if (f.hits) query.hits = 1
  return sdk.client.fetch<{ ids: string[]; count: number; facets: CatalogFacets }>(`/store/ohana/catalog`, {
    method: "GET",
    query,
    cache: "no-store",
  })
}

/** Разбор фильтров из search params страницы */
export const parseCatalogFilters = async (sp: Record<string, string | string[] | undefined>): Promise<CatalogFilters> => {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ""
  return {
    size: one(sp.size).split(",").map((s) => s.trim()).filter(Boolean),
    pmin: Number(one(sp.pmin)) || 0,
    pmax: Number(one(sp.pmax)) || 0,
    // по умолчанию — только в наличии (как кнопка «Скрыть отсутствующие» на старом сайте); stock=all — показать всё
    stock: one(sp.stock) === "all" ? "" : one(sp.stock) === "full" ? "full" : "any",
    sale: one(sp.sale) === "1",
    new: one(sp.new) === "1",
    hits: one(sp.hits) === "1",
  }
}
