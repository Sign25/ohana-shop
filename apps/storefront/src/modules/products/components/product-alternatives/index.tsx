import { listAlternatives } from "@/lib/data/product-extras"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { clx } from "@medusajs/ui"
import Image from "next/image"

/** «Другие расцветки» под галереей: миниатюры товаров той же группы альтернатив из 1С; распроданные приглушены */
export default async function ProductAlternatives({ productId, currentColor }: { productId: string; currentColor?: string }) {
  const items = await listAlternatives(productId)
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-[13px] text-oh-graphite">
        <span className="font-medium text-oh-ink">Другие расцветки и модели</span>
        {currentColor && <span>сейчас: {currentColor}</span>}
      </div>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((p) => (
          <li key={p.id} className="shrink-0">
            <LocalizedClientLink href={`/products/${p.handle}`} title={`${p.title}${p.in_stock ? "" : " — нет в наличии"}`} className={clx("group flex w-[76px] flex-col gap-1", !p.in_stock && "opacity-45")}>
              <span className="relative block h-[100px] w-[76px] overflow-hidden rounded-lg border border-oh-line bg-white group-hover:border-oh-azure">
                {p.thumbnail && <Image src={p.thumbnail} alt={p.title} fill sizes="76px" className="object-contain" />}
              </span>
              <span className="truncate text-center text-[11px] text-oh-graphite">{p.color || p.code || ""}</span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
