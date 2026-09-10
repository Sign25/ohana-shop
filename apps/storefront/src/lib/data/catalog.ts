"use server"

import { sdk } from "@/lib/config"

export type CatalogFilters = {
  size?: string[]
  pmin?: number
  pmax?: number
  stock?: "any" | "full" | ""
}
export type CatalogOrder = "new" | "price_asc" | "price_desc" | "title"
export type CatalogFacets = {
  sizes: { key: string; count: number }[]
  price_min: number
  price_max: number
  in_stock: number
  full_row: number
}

/** Поиск по каталогу с фильтрами (наш маршрут /store/ohana/catalog): id товаров в нужном порядке + фасеты */
export const searchCatalog = async (params: {
  categoryIds?: string[]
  q?: string
  filters?: CatalogFilters
  order?: CatalogOrder
  limit: number
  offset: number
}): Promise<{ ids: string[]; count: number; facets: CatalogFacets }> => {
  const f = params.filters || {}
  const query: Record<string, string | number> = { limit: params.limit, offset: params.offset, order: params.order || "new" }
  if (params.categoryIds?.length) query.category_id = params.categoryIds.join(",")
  if (params.q) query.q = params.q
  if (f.size?.length) query.size = f.size.join(",")
  if (f.pmin) query.pmin = f.pmin
  if (f.pmax) query.pmax = f.pmax
  if (f.stock) query.stock = f.stock
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
    stock: one(sp.stock) === "any" ? "any" : one(sp.stock) === "full" ? "full" : "",
  }
}
