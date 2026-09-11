import { listCategoryTree } from "@/lib/data/categories"
import { searchCatalog } from "@/lib/data/catalog"
import { getProductsById } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { audienceLabel } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import ProductPreview from "@/modules/products/components/product-preview"
import { getWbRatings } from "@/lib/data/wb"
import { HttpTypes } from "@medusajs/types"


/**
 * Секции главной как на ohanaopt.ru: по каждому разделу-аудитории ряд из 4 товаров
 * с заголовком-ссылкой «Женщинам ›» (см. ohana-happywear-redesign, кластер D).
 */
export default async function FeaturedProducts({ countryCode }: { countryCode: string }) {
  const [categories, region] = await Promise.all([listCategoryTree().catch(() => []), getRegion(countryCode)])
  if (!region) return null
  const roots = categories.filter((c) => !c.parent_category_id && (c.metadata as any)?.kind !== "showcase" && (c.metadata as any)?.kind !== "manual-hits")
  // продукты питания: свой блок на главной, в «Новинках сезона» их нет
  const foodRoot = roots.find((c) => /продукт|питани/i.test(c.name))
  const foodIds = new Set<string>()
  if (foodRoot) { const walk = (id: string) => { foodIds.add(id); categories.filter((k) => k.parent_category_id === id).forEach((k) => walk(k.id)) }; walk(foodRoot.id) }
  const isFood = (p: HttpTypes.StoreProduct) => (p.categories || []).some((c: any) => foodIds.has(c.id))
  // одна модель — одна карточка: расцветки «Номенклатуры 2026» различаются только кодом в названии (как на старом сайте)
  const modelKey = (p: HttpTypes.StoreProduct) => String(p.title).toLowerCase().replace(/,?\s*(артикул:?\s*)?(?=\S*\d)[а-яёa-z]{1,6}(-[а-яё0-9a-z]+){1,4}\b.*$/u, "").replace(/\(.*$/, "").trim()
  const dedup = (list: HttpTypes.StoreProduct[], n: number) => { const seen = new Set<string>(); return list.filter((p) => { const k = modelKey(p); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, n) }

  const sections = await Promise.all(
    roots.map(async (c) => {
      const ids = [c.id, ...categories.filter((k) => k.parent_category_id === c.id).map((k) => k.id)]
      // как на старом сайте: в наличии, по популярности (отзывы Wildberries), одна модель — одна карточка
      const found = await searchCatalog({ categoryIds: ids, filters: { stock: "any" }, order: "hits", limit: 16, offset: 0 }).catch(() => ({ ids: [] as string[] }))
      const got = found.ids.length ? await getProductsById({ ids: found.ids, regionId: region.id }) : []
      const byId = new Map(got.map((p) => [p.id, p]))
      return { category: c, products: dedup(found.ids.map((id) => byId.get(id)).filter(Boolean) as typeof got, 4) }
    })
  )

  // «Новинки сезона»: свежие поступления за 60 дней, без комплектов «Номенклатуры 2026», без дублей моделей
  const fresh = await searchCatalog({ filters: { stock: "any", new: true }, order: "new", limit: 40, offset: 0 }).catch(() => ({ ids: [] as string[] }))
  const freshGot = fresh.ids.length ? await getProductsById({ ids: fresh.ids, regionId: region.id }) : []
  const freshById = new Map(freshGot.map((p) => [p.id, p]))
  const newest = dedup(fresh.ids.map((id) => freshById.get(id)).filter((p) => p && !(p.metadata as any)?.lineika && !isFood(p)) as typeof freshGot, 8)
  const wb = await getWbRatings([...newest, ...sections.flatMap((s) => s.products)].map((p) => String((p.metadata as any)?.code || "")))
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
      {newest.length >= 4 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <LocalizedClientLink href="/store?new=1" className="oh-h text-[28px] hover:text-oh-azure">Новинки сезона <span className="text-oh-muted">›</span></LocalizedClientLink>
            <LocalizedClientLink href="/store?new=1" className="text-[13px] text-oh-azure hover:underline">Все новинки</LocalizedClientLink>
          </div>
          <ul className="grid grid-cols-2 gap-3 small:grid-cols-4">
            {newest.map((p) => (
              <li key={p.id}><ProductPreview product={p} region={region} wb={wb[String((p.metadata as any)?.code || "")]} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
