import { listCategoryTree } from "@/lib/data/categories"
import { visibleShowcases } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** Главные баннеры — те же креативы, что на ohanaopt.ru; под ними чипы-подборки (как на текущем сайте). */
const banners = [
  { href: "/categories/osen-zima-2027", src: "/hero/hero_autumn_family.jpg", w: 1280, h: 371, alt: "Осень/зима 2027 — тёплая одежда для всей семьи" },
  { href: "/categories/zhenskaya-odezhda", src: "/hero/hero_pir_mir.jpg", w: 1932, h: 560, alt: "И в пир, и в мир, и в добрые люди — женская одежда" },
]

const Hero = async () => {
  const categories = await listCategoryTree().catch(() => [])
  const showcases = visibleShowcases(categories)
  const chips = [
    { label: "Новинки", href: "/store?sortBy=created_at" },
    ...showcases.map((c) => ({ label: c.name, href: `/categories/${c.handle}` })),
  ]

  return (
    <div className="content-container flex flex-col gap-4 py-4">
      {banners.map((b, i) => (
        <LocalizedClientLink key={b.href} href={b.href} className="block overflow-hidden rounded-[20px] bg-oh-paper">
          <Image src={b.src} alt={b.alt} width={b.w} height={b.h} priority={i === 0} sizes="(max-width: 1440px) 100vw, 1440px" className="h-auto w-full" />
        </LocalizedClientLink>
      ))}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {chips.map((c) => (
          <LocalizedClientLink key={c.label} href={c.href} className="oh-chip">
            <span className="text-oh-primary">#</span>
            {c.label}
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default Hero
