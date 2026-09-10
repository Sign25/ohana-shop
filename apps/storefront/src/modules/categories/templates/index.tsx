import CategoryBreadcrumb from "@/modules/categories/category-breadcrumb"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import SkeletonProductGrid from "@/modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@/modules/store/components/refinement-list"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@/modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"
import { notFound } from "next/navigation"
import { Suspense } from "react"

export default function CategoryTemplate({
  categories,
  currentCategory,
  sortBy,
  page,
  countryCode,
}: {
  categories: HttpTypes.StoreProductCategory[]
  currentCategory: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  if (!currentCategory || !countryCode) notFound()

  const children = categories.filter((c) => c.parent_category_id === currentCategory.id)
  const descendants = (id: string): string[] =>
    categories.filter((c) => c.parent_category_id === id).flatMap((c) => [c.id, ...descendants(c.id)])
  const categoryIds = [currentCategory.id, ...descendants(currentCategory.id)]

  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6" data-testid="category-container">
        <CategoryBreadcrumb categories={categories} category={currentCategory} />
        <h1 className="oh-h text-[30px]">{currentCategory.name}</h1>
        {children.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <LocalizedClientLink key={c.id} href={`/categories/${c.handle}`} className="oh-chip">
                {c.name}
              </LocalizedClientLink>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 small:flex-row small:items-start">
          <RefinementList sortBy={sort} categories={categories} currentCategory={currentCategory} listName={currentCategory.name} data-testid="sort-by-container" hideOptionsPicker />
          <div className="w-full">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProducts sortBy={sort} page={pageNumber} categoryIds={categoryIds} countryCode={countryCode} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
