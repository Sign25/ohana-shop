import { listCategoryTree } from "@/lib/data/categories"
import { listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { audienceLabel } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import ProductPreview from "@/modules/products/components/product-preview"

const FIELDS = "*variants.calculated_price,+variants.inventory_quantity,+variants.metadata,+metadata"

/**
 * Секции главной как на ohanaopt.ru: по каждому разделу-аудитории ряд из 4 товаров
 * с заголовком-ссылкой «Женщинам ›» (см. ohana-happywear-redesign, кластер D).
 */
export default async function FeaturedProducts({ countryCode }: { countryCode: string }) {
  const [categories, region] = await Promise.all([listCategoryTree().catch(() => []), getRegion(countryCode)])
  if (!region) return null
  const roots = categories.filter((c) => !c.parent_category_id && (c.metadata as any)?.kind !== "showcase").slice(0, 5)

  const sections = await Promise.all(
    roots.map(async (c) => {
      const ids = [c.id, ...categories.filter((k) => k.parent_category_id === c.id).map((k) => k.id)]
      const {
        response: { products },
      } = await listProducts({
        pageParam: 1,
        queryParams: { limit: 4, category_id: ids, order: "-created_at", fields: FIELDS } as any,
        countryCode,
      })
      return { category: c, products }
    })
  )

  return (
    <div className="content-container flex flex-col gap-10 py-6">
      {sections
        .filter((s) => s.products.length > 0)
        .map(({ category, products }) => (
          <section key={category.id}>
            <div className="mb-4 flex items-baseline justify-between">
              <LocalizedClientLink href={`/categories/${category.handle}`} className="oh-h text-[28px] hover:text-oh-azure">
                {audienceLabel(category.name)} <span className="text-oh-muted">›</span>
              </LocalizedClientLink>
              <LocalizedClientLink href={`/categories/${category.handle}`} className="text-[13px] text-oh-azure hover:underline">
                Смотреть все
              </LocalizedClientLink>
            </div>
            <ul className="grid grid-cols-2 gap-3 small:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductPreview product={p} region={region} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
