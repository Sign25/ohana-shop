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
      {categories && <CategoryList categories={categories} currentCategory={currentCategory} />}
    </div>
  )
}

export default RefinementList
