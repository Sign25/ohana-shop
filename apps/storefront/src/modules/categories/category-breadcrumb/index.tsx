import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const CategoryBreadcrumb = ({
  categories,
  category,
}: {
  categories: HttpTypes.StoreProductCategory[]
  category: HttpTypes.StoreProductCategory
}) => {
  const chain: HttpTypes.StoreProductCategory[] = []
  let cur: HttpTypes.StoreProductCategory | undefined = category
  while (cur) {
    chain.unshift(cur)
    cur = categories.find((c) => c.id === cur?.parent_category_id)
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-2 text-[13px] text-oh-muted">
      <li>
        <LocalizedClientLink className="hover:text-oh-azure" href="/">
          Главная
        </LocalizedClientLink>
      </li>
      <li>›</li>
      <li>
        <LocalizedClientLink className="hover:text-oh-azure" href="/store">
          Каталог
        </LocalizedClientLink>
      </li>
      {chain.map((c, i) => (
        <li key={c.id} className="flex items-center gap-x-2">
          <span>›</span>
          {i === chain.length - 1 ? (
            <span className="text-oh-graphite">{c.name}</span>
          ) : (
            <LocalizedClientLink className="hover:text-oh-azure" href={`/categories/${c.handle}`}>
              {c.name}
            </LocalizedClientLink>
          )}
        </li>
      ))}
    </ul>
  )
}

export default CategoryBreadcrumb
