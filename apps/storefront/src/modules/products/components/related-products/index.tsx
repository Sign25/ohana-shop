import { listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import { getWbRatings } from "@/lib/data/wb"
import { mainCategory } from "@/lib/util/ohana"

/** «Похожие товары» — из той же категории, что и текущий товар */
export default async function RelatedProducts({ product, countryCode }: { product: HttpTypes.StoreProduct; countryCode: string }) {
  const region = await getRegion(countryCode)
  if (!region) return null

  const categoryId = mainCategory(product)?.id
  const queryParams: Record<string, any> = {
    region_id: region.id,
    limit: 5,
    fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.metadata,+metadata",
  }
  if (categoryId) queryParams.category_id = [categoryId]

  const products = await listProducts({ queryParams: queryParams as any, countryCode }).then(({ response }) =>
    response.products.filter((p) => p.id !== product.id).slice(0, 4)
  )
  if (!products.length) return null
  const wb = await getWbRatings(products.map((p) => String((p.metadata as any)?.code || "")))

  return (
    <div className="flex flex-col gap-4 py-6">
      <h2 className="oh-h text-[26px]">Похожие товары</h2>
      <ul className="grid grid-cols-2 gap-3 small:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <Product region={region} product={p} wb={wb[String((p.metadata as any)?.code || "")]} />
          </li>
        ))}
      </ul>
    </div>
  )
}
