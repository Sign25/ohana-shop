"use client"

import { ChevronUpDown } from "@medusajs/icons"

export type SortOptions = "created_at" | "title" | "price_asc" | "price_desc"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  "data-testid"?: string
}

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Сначала новые" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "title", label: "По названию" },
]

const SortProducts = ({ "data-testid": dataTestId, sortBy, setQueryParams }: SortProductsProps) => {
  return (
    <div className="flex items-center justify-between gap-2 p-3 text-sm">
      <span className="text-oh-muted">Сортировка</span>
      <div className="relative">
        <select
          className="w-full appearance-none overflow-hidden bg-transparent pr-7 font-medium text-oh-ink focus:outline-none"
          title="Сортировка"
          value={sortBy}
          onChange={(e) => setQueryParams("sortBy", e.target.value as SortOptions)}
          data-testid={dataTestId}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
          <ChevronUpDown className="h-4 w-4 text-oh-muted" />
        </div>
      </div>
    </div>
  )
}

export default SortProducts
