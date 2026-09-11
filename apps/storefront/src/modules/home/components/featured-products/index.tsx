import { listCategoryTree } from "@/lib/data/categories"
import { searchCatalog } from "@/lib/data/catalog"
import { getProductsById } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { audienceLabel } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import ProductPreview from "@/modules/products/components/product-preview"
import { getWbRatings } from "@/lib/data/wb"


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
      // наш каталожный маршрут: только с фото и в наличии, новые первыми
      const found = await searchCatalog({ categoryIds: ids, filters: { stock: "any" }, order: "new", limit: 4, offset: 0 }).catch(() => ({ ids: [] as string[] }))
      const got = found.ids.length ? await getProductsById({ ids: found.ids, regionId: region.id }) : []
      const byId = new Map(got.map((p) => [p.id, p]))
      return { category: c, products: found.ids.map((id) => byId.get(id)).filter(Boolean) as typeof got }
    })
  )

  const wb = await getWbRatings(sections.flatMap((s) => s.products.map((p) => String((p.metadata as any)?.code || ""))))
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
                  <ProductPreview product={p} region={region} wb={wb[String((p.metadata as any)?.code || "")]} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
