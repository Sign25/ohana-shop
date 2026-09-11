import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

export type SectionTile = { title: string; img: string; href: string }

/** Две большие плитки подразделов над рядом товаров секции (как на старом сайте) */
const SectionTiles = ({ tiles }: { tiles: SectionTile[] }) => {
  if (!tiles.length) return null
  return (
    <ul className="mb-3 grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <li key={t.title + t.href}>
          <LocalizedClientLink href={t.href} className="group relative block aspect-[2/1] overflow-hidden rounded-card bg-oh-paper small:aspect-[2.1/1]">
            <Image src={t.img} alt={t.title} fill sizes="(max-width: 1024px) 50vw, 40vw" className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-4 pb-4 pt-10 text-[22px] font-bold leading-tight text-white drop-shadow small:px-6 small:text-[28px]">{t.title}</span>
          </LocalizedClientLink>
        </li>
      ))}
    </ul>
  )
}

export default SectionTiles
