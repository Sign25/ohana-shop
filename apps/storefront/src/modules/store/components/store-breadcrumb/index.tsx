import LocalizedClientLink from "@/modules/common/components/localized-client-link"

const StoreBreadcrumb = ({ current = "Все товары" }: { current?: string }) => {
  return (
    <ul className="flex items-center gap-x-2 text-[13px] text-oh-muted">
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
      <li>›</li>
      <li className="text-oh-graphite">{current}</li>
    </ul>
  )
}

export default StoreBreadcrumb
