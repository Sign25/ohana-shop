import { listCategoryTree } from "@/lib/data/categories"
import { listBanners } from "@/lib/data/content"
import { listTags, searchCatalog } from "@/lib/data/catalog"
import HeroCarousel from "@/modules/home/components/hero-carousel"
import { visibleShowcases } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"

/** Баннеры карусели — из админки «Баннеры» (модуль content); если там пусто, показываем креативы по умолчанию */
const DEFAULT_BANNERS = [
  { href: "/categories/osen-zima-2027", src: "/hero/hero_autumn_family.jpg", w: 1280, h: 371, alt: "Осень/зима 2027 — тёплая одежда для всей семьи" },
  { href: "/categories/zhenskaya-odezhda", src: "/hero/hero_pir_mir.jpg", w: 1932, h: 560, alt: "И в пир, и в мир, и в добрые люди — женская одежда" },
]

const Hero = async () => {
  const [categories, adminBanners, tags, all] = await Promise.all([
    listCategoryTree().catch(() => []),
    listBanners("hero"),
    listTags(),
    searchCatalog({ filters: { stock: "any" }, limit: 1, offset: 0 }).catch(() => null),
  ])
  const banners = adminBanners.length
    ? adminBanners.map((b) => ({ href: b.link || "/store", src: b.image_url, w: 1920, h: 560, alt: b.alt || b.title }))
    : DEFAULT_BANNERS
  // хэштеги формируются сами: сначала динамические подборки (только если есть товары), затем теги из 1С
  // (metadata.tags, порядок 1С), затем подборки-категории из 1С (Осень/зима, Big size…)
  const showcases = visibleShowcases(categories)
  const f = all?.facets
  const chips: { label: string; href: string }[] = [
    ...(f && f.new > 0 ? [{ label: "Новинки", href: "/store?new=1" }] : []),
    ...(f && f.sale > 0 ? [{ label: "Акции", href: "/store?sale=1" }] : []),
    ...(f && f.hits > 0 ? [{ label: "Хиты продаж", href: "/store?hits=1" }] : []),
    ...tags.filter((t) => !["Новинки", "Акции и скидки", "Хит продаж"].includes(t.tag)).map((t) => ({ label: t.tag, href: `/store?tag=${encodeURIComponent(t.tag)}` })),
    ...showcases.map((c) => ({ label: c.name, href: `/categories/${c.handle}` })),
  ]

  return (
    <div className="content-container flex flex-col gap-4 py-4">
      <HeroCarousel banners={banners} />
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
