import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"
import CallbackButton from "@/modules/layout/components/callback-button"

/**
 * Топ-панель как на текущем ohanaopt.ru (вариант A, 07.09.2026): пилюля наград слева,
 * сервисные чипы по центру (калькуляторы перенесены на этот сайт), телефон справа.
 */
const SERVICES = [
  { label: "Быстрый заказ", href: "/bystryy-zakaz" },
  { label: "Бизнес с Оханой", href: "/biznes-s-ohanoy" },
  { label: "Совместные покупки", href: "/sovmestnye-pokupki" },
  { label: "Подбор размера", href: "/podbor-razmera" },
]

const TopBar = () => {
  return (
    <div className="hidden small:block bg-oh-paper border-b border-oh-line text-[12px] text-oh-graphite">
      <div className="content-container flex items-center justify-between gap-4 py-1.5">
        <LocalizedClientLink
          href="/p/nagrady"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-oh-line bg-white px-3 py-1 hover:border-oh-azure hover:text-oh-azure"
          title="Награды Ohana"
        >
          <Image src="/ui/marka1_logo.webp" alt="Марка №1" width={18} height={18} />
          <span className="font-medium">Марка №1</span>
          <span className="text-oh-muted">·</span>
          <Image src="/ui/award_brand.webp" alt="Бренд года" width={16} height={16} />
          <span className="font-medium">Бренд года 2025</span>
        </LocalizedClientLink>

        <nav className="flex items-center gap-2">
          {SERVICES.map((s) => (
            <LocalizedClientLink key={s.href} href={s.href} className="oh-chip whitespace-nowrap !px-3 !py-1 !text-[12px]">
              {s.label}
            </LocalizedClientLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <a href="tel:+79914301730" className="font-semibold text-oh-ink hover:text-oh-azure whitespace-nowrap">
            8 (991) 430-17-30
          </a>
          <span className="text-oh-muted hidden whitespace-nowrap large:inline">пн–пт 10:00–18:00 (Омск)</span>
          <CallbackButton />
        </div>
      </div>
    </div>
  )
}

export default TopBar
