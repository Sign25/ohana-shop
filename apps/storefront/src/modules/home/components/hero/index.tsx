import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** Главные баннеры: те же креативы, что на текущем ohanaopt.ru (осень/зима → категория 560, «И в пир, и в мир» → женская одежда). */
const banners = [
  { href: "/categories/osen-zima-2027", src: "/hero/hero_autumn_family.jpg", w: 1280, h: 371, alt: "Осень/зима 2027 — тёплая одежда для всей семьи" },
  { href: "/categories/zhenskaya-odezhda", src: "/hero/hero_pir_mir.jpg", w: 1932, h: 560, alt: "И в пир, и в мир, и в добрые люди — женская одежда" },
]

const Hero = () => {
  return (
    <div className="content-container flex flex-col gap-4 py-4">
      {banners.map((b, i) => (
        <LocalizedClientLink key={b.href} href={b.href} className="block overflow-hidden rounded-2xl bg-neutral-100">
          <Image src={b.src} alt={b.alt} width={b.w} height={b.h} priority={i === 0} sizes="(max-width: 1440px) 100vw, 1440px" className="w-full h-auto" />
        </LocalizedClientLink>
      ))}
    </div>
  )
}

export default Hero
