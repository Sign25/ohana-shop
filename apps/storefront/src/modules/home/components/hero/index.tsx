import { listCategoryTree } from "@/lib/data/categories"
import { listBanners } from "@/lib/data/content"
import { visibleShowcases } from "@/lib/util/ohana"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { clx } from "@medusajs/ui"
import Image from "next/image"

/** Баннеры карусели — из админки «Баннеры» (модуль content); если там пусто, показываем креативы по умолчанию */
const DEFAULT_BANNERS = [
  { href: "/categories/osen-zima-2027", src: "/hero/hero_autumn_family.jpg", w: 1280, h: 371, alt: "Осень/зима 2027 — тёплая одежда для всей семьи" },
  { href: "/categories/zhenskaya-odezhda", src: "/hero/hero_pir_mir.jpg", w: 1932, h: 560, alt: "И в пир, и в мир, и в добрые люди — женская одежда" },
]

const Hero = async () => {
  const [categories, adminBanners] = await Promise.all([listCategoryTree().catch(() => []), listBanners("hero")])
  const banners = adminBanners.length
    ? adminBanners.map((b) => ({ href: b.link || "/store", src: b.image_url, w: 1920, h: 560, alt: b.alt || b.title }))
    : DEFAULT_BANNERS
  const showcases = visibleShowcases(categories)
  const chips = [
    { label: "Новинки", href: "/store?new=1" },
    { label: "Акции", href: "/store?sale=1" },
    { label: "Хиты продаж", href: "/store?sortBy=hits" },
    ...showcases.map((c) => ({ label: c.name, href: `/categories/${c.handle}` })),
  ]

  const offer = [
    ["Опт от 35 000 ₽", "цены от производителя, без посредников"],
    ["Крупный опт от 100 000 ₽", "скидка применяется в корзине сама"],
    ["Отгрузка 24–48 часов", "со склада в Омске"],
    ["До терминала ТК бесплатно", "ПЭК, Деловые Линии, Энергия, Почта"],
  ]

  return (
    <div className="content-container flex flex-col gap-4 py-4">
      <div className="grid grid-cols-2 gap-2 small:grid-cols-4">
        {offer.map(([t, d]) => (
          <div key={t} className="rounded-card bg-oh-paper px-4 py-3">
            <div className="text-[15px] font-semibold text-oh-ink">{t}</div>
            <div className="text-[12.5px] text-oh-graphite">{d}</div>
          </div>
        ))}
      </div>
      {banners.map((b, i) => (
        <LocalizedClientLink key={b.href} href={b.href} className={clx("block overflow-hidden rounded-[20px] bg-oh-paper", i > 0 && "hidden small:block")}>
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
