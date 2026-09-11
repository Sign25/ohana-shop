import { CatalogFilters, CatalogOrder, searchCatalog } from "@/lib/data/catalog"
import { getProductsById, listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { plural } from "@/lib/util/ohana"
import ProductPreview from "@/modules/products/components/product-preview"
import CatalogFiltersBar from "@/modules/store/components/catalog-filters"
import { Pagination } from "@/modules/store/components/pagination"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import { B2BCustomer } from "@/types"
import { HttpTypes } from "@medusajs/types"

export const PRODUCT_LIMIT = 24

const ORDER: Record<SortOptions, CatalogOrder> = {
  created_at: "new",
  title: "title",
  price_asc: "price_asc",
  price_desc: "price_desc",
}

/**
 * Список товаров раздела/поиска. Порядок и фильтры (размер, цена, наличие) считает наш маршрут
 * /store/ohana/catalog — он отдаёт id и фасеты, сами карточки берём штатным Store API по id.
 * Пагинация серверная: стартер тянул первые 100 товаров и сортировал их в памяти.
 */
export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  categoryIds,
  productsIds,
  countryCode,
  q,
  filters,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  categoryIds?: string[]
  productsIds?: string[]
  countryCode: string
  customer?: B2BCustomer | null
  optionValueIds?: string[]
  q?: string
  filters?: CatalogFilters
}) {
  const region = await getRegion(countryCode)
  if (!region) return null

  let products: HttpTypes.StoreProduct[] = [], count = 0, facets = null as Awaited<ReturnType<typeof searchCatalog>>["facets"] | null

  if (collectionId || productsIds) {
    // коллекции и явные списки — штатным API (без фильтров)
    const queryParams: Record<string, any> = { limit: PRODUCT_LIMIT, order: "-created_at", fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.metadata,+metadata" }
    if (collectionId) queryParams.collection_id = [collectionId]
    if (productsIds) queryParams.id = productsIds
    const r = await listProducts({ pageParam: page, queryParams, countryCode })
    products = r.response.products; count = r.response.count
  } else {
    const found = await searchCatalog({
      categoryIds: categoryIds?.length ? categoryIds : categoryId ? [categoryId] : undefined,
      q, filters, order: ORDER[sortBy || "created_at"] || "new", limit: PRODUCT_LIMIT, offset: (Math.max(page, 1) - 1) * PRODUCT_LIMIT,
    })
    count = found.count; facets = found.facets
    if (found.ids.length) {
      const got = await getProductsById({ ids: found.ids, regionId: region.id })
      const byId = new Map(got.map((p) => [p.id, p]))
      products = found.ids.map((id) => byId.get(id)).filter(Boolean) as HttpTypes.StoreProduct[]
    }
  }

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)
  const filtered = !!(filters && ((filters.size && filters.size.length) || filters.pmin || filters.pmax || filters.stock === "full" || filters.sale || filters.new))

  return (
    <>
      {facets && (facets.sizes.length > 1 || facets.in_stock > 0) && <CatalogFiltersBar facets={facets} filters={filters || {}} />}
      <div className="mb-3 text-sm text-oh-muted">
        {count > 0
          ? `${count} ${plural(count, "товар", "товара", "товаров")}${q ? ` по запросу «${q}»` : ""}${filtered ? " по фильтру" : ""}`
          : q
          ? `По запросу «${q}» ничего не нашлось`
          : filtered
          ? "По таким условиям ничего не нашлось — попробуйте снять часть фильтров"
          : filters?.stock === "any" && facets && facets.in_stock === 0 && facets.sizes.length === 0
          ? "Сейчас всё распродано — нажмите «Все», чтобы посмотреть модели и оставить заявку"
          : "В этом разделе пока нет товаров"}
      </div>
      {products.length > 0 && (
        <ul className="grid w-full grid-cols-2 gap-3 small:grid-cols-3 medium:grid-cols-4" data-testid="products-list">
          {products.map((p) => (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && <Pagination data-testid="product-pagination" page={page} totalPages={totalPages} />}
    </>
  )
}
