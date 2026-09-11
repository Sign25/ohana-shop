import { parseCatalogFilters } from "@/lib/data/catalog"
import { listCategoryTree } from "@/lib/data/categories"
import SkeletonProductGrid from "@/modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@/modules/store/components/refinement-list"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import StoreBreadcrumb from "@/modules/store/components/store-breadcrumb"
import PaginatedProducts from "@/modules/store/templates/paginated-products"
import { Metadata } from "next"
import { Suspense } from "react"

export const dynamicParams = true

export const metadata: Metadata = {
  title: "Каталог",
  description: "Все товары Ohana Market оптом: женская, мужская и детская одежда, домашний текстиль.",
}

type Params = {
  searchParams: Promise<{ sortBy?: SortOptions; page?: string; q?: string; size?: string; pmin?: string; pmax?: string; stock?: string; sale?: string; new?: string }>
  params: Promise<{ countryCode: string }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, q } = searchParams
  const sort = sortBy || "created_at"
  const pageNumber = page ? parseInt(page) : 1
  const categories = await listCategoryTree()
  const filters = await parseCatalogFilters(searchParams)

  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6" data-testid="category-container">
        <StoreBreadcrumb current={q ? `Поиск: ${q}` : "Все товары"} />
        <h1 className="oh-h text-[30px]">{q ? `Поиск «${q}»` : "Все товары"}</h1>
        <div className="flex flex-col gap-3 small:flex-row small:items-start">
          <RefinementList sortBy={sort} categories={categories} />
          <div className="w-full">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProducts sortBy={sort} page={pageNumber} countryCode={params.countryCode} q={q} filters={filters} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
