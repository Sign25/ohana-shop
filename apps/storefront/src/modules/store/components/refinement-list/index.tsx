"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import { HttpTypes } from "@medusajs/types"
import CategoryList from "./category-list"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  listName?: string
  "data-testid"?: string
  categories?: HttpTypes.StoreProductCategory[]
  currentCategory?: HttpTypes.StoreProductCategory
  productOptions?: HttpTypes.StoreProductOption[]
  hideOptionsPicker?: boolean
}

const RefinementList = ({ sortBy, "data-testid": dataTestId, categories, currentCategory }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    const nextUrl = query ? `${pathname}?${query}` : pathname
    const currentSearch = searchParams.toString()
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname
    if (nextUrl === currentUrl) return
    router.push(nextUrl)
  }

  return (
    <div className="flex w-full flex-col gap-3 small:w-[260px] small:shrink-0">
      <div className="oh-card">
        <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
      </div>
      {categories && (
        <>
          {/* на телефоне дерево разделов свёрнуто, иначе товары уезжают под длинный список */}
          <details className="oh-card group small:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-oh-ink [&::-webkit-details-marker]:hidden">
              Разделы каталога
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-oh-muted transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </summary>
            <div className="border-t border-oh-line">
              <CategoryList categories={categories} currentCategory={currentCategory} bare />
            </div>
          </details>
          <div className="hidden small:block">
            <CategoryList categories={categories} currentCategory={currentCategory} />
          </div>
        </>
      )}
    </div>
  )
}

export default RefinementList
