import { listBanners } from "@/lib/data/content"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** Узкая рекламная полоса между секциями (админка «Баннеры», место strip) */
export default async function StripBanner() {
  const banners = await listBanners("strip")
  if (!banners.length) return null
  const b = banners[0]
  return (
    <div className="content-container py-2">
      <LocalizedClientLink href={b.link || "/store"} className="block overflow-hidden rounded-[20px] bg-oh-paper">
        <Image src={b.image_url} alt={b.alt || b.title} width={2280} height={364} sizes="(max-width: 1440px) 100vw, 1440px" className="h-auto w-full" />
      </LocalizedClientLink>
    </div>
  )
}
