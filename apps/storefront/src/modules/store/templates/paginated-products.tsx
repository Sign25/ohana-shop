import { listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { plural } from "@/lib/util/ohana"
import ProductPreview from "@/modules/products/components/product-preview"
import { Pagination } from "@/modules/store/components/pagination"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import { B2BCustomer } from "@/types"

export const PRODUCT_LIMIT = 24

const ORDER: Record<SortOptions, string> = {
  created_at: "-created_at",
  title: "title",
}

/**
 * Серверная пагинация: стартер тянул первые 100 товаров и сортировал их в памяти,
 * поэтому каталог из 710 позиций «заканчивался» на сотне. Теперь limit/offset/order
 * уходят в Store API, а count — настоящий.
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
}) {
  const region = await getRegion(countryCode)
  if (!region) return null

  const queryParams: Record<string, any> = {
    limit: PRODUCT_LIMIT,
    order: ORDER[sortBy || "created_at"] || "-created_at",
    fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.metadata,+metadata",
  }
  if (collectionId) queryParams.collection_id = [collectionId]
  // товары привязаны к листовым категориям, поэтому для раздела передаём его и всех потомков
  if (categoryIds?.length) queryParams.category_id = categoryIds
  else if (categoryId) queryParams.category_id = [categoryId]
  if (productsIds) queryParams.id = productsIds
  if (q) queryParams.q = q

  const {
    response: { products, count },
  } = await listProducts({ pageParam: page, queryParams, countryCode })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      <div className="mb-3 text-sm text-oh-muted">
        {count > 0
          ? `${count} ${plural(count, "товар", "товара", "товаров")}${q ? ` по запросу «${q}»` : ""}`
          : q
          ? `По запросу «${q}» ничего не нашлось`
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
