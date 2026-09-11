import { listCategoryTree } from "@/lib/data/categories"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"
import { MARKETPLACES, PRICE_LIST_URL } from "@/lib/util/marketplaces"

/** Служебные страницы пока живут на старом сайте — ссылки временные, до переноса разделов. */
const BUYERS = [
  { label: "Как сделать заказ", href: "/p/how-to-order" },
  { label: "Условия работы", href: "/p/conditions" },
  { label: "Доставка", href: "/p/delivery" },
  { label: "Оплата", href: "/p/payment" },
  { label: "Возврат и обмен", href: "/p/return" },
  { label: "Вопросы и ответы", href: "/p/faq" },
  { label: "Подбор размера", href: "/podbor-razmera" },
  { label: "Бизнес с Оханой", href: "/biznes-s-ohanoy" },
  { label: "Совместные покупки", href: "/sovmestnye-pokupki" },
  { label: "Быстрый заказ", href: "/bystryy-zakaz" },
  { label: "Прайс-лист (Excel)", href: PRICE_LIST_URL },
]
const COMPANY = [
  { label: "О компании", href: "/p/about" },
  { label: "Награды", href: "/p/nagrady" },
  { label: "Сертификаты", href: "/p/sertificat" },
  { label: "Реквизиты", href: "/p/requisites" },
  { label: "Контакты", href: "/p/contacts" },
  { label: "Договор-оферта", href: "/p/oferta" },
  { label: "Политика конфиденциальности", href: "/p/privacy-policy" },
]

export default async function Footer() {
  const categories = await listCategoryTree().catch(() => [])
  const roots = categories.filter((c) => !c.parent_category_id && (c.metadata as any)?.kind !== "showcase")

  return (
    <footer className="mt-10 border-t border-oh-line bg-oh-paper">
      <div className="content-container grid grid-cols-1 gap-10 py-12 small:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <LocalizedClientLink href="/" className="w-fit">
            <Image src="/logo.png" alt="Ohana market" width={432} height={192} className="h-11 w-auto" />
          </LocalizedClientLink>
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-oh-graphite">
            Одежда и домашний текстиль оптом напрямую от производителя из Омска. Собственное производство, отгрузка 24–48 часов, доставка до терминала ТК бесплатно.
          </p>
          <div className="flex flex-col gap-1 text-[14px]">
            <a href="tel:+79914301730" className="font-semibold text-oh-ink hover:text-oh-azure">8 (991) 430-17-30</a>
            <a href="mailto:info@ohanamarket.ru" className="text-oh-graphite hover:text-oh-azure">info@ohanamarket.ru</a>
            <span className="text-oh-muted">пн–пт 10:00–18:00, Омск</span>
          </div>
        </div>

        <div>
          <div className="mb-3 text-[14px] font-semibold text-oh-ink">Каталог</div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {roots.map((c) => (
              <li key={c.id}>
                <LocalizedClientLink href={`/categories/${c.handle}`} className="text-oh-graphite hover:text-oh-azure">
                  {c.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 text-[14px] font-semibold text-oh-ink">Покупателям</div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {BUYERS.map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/") ? (
                  <LocalizedClientLink href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</LocalizedClientLink>
                ) : (
                  <a href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 text-[14px] font-semibold text-oh-ink">Компания</div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {COMPANY.map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/") ? (
                  <LocalizedClientLink href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</LocalizedClientLink>
                ) : (
                  <a href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-oh-line">
        <div className="content-container flex flex-col gap-2 py-4 text-[12px] text-oh-muted small:flex-row small:items-center small:justify-between">
          <span>© {new Date().getFullYear()} Ohana Market. Оптовые поставки одежды и домашнего текстиля.</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Розница и маркетплейсы:</span>
            {MARKETPLACES.map((m) => <a key={m.key} href={m.href} target="_blank" rel="noopener nofollow" className="font-medium text-oh-graphite hover:text-oh-azure">{m.name}</a>)}
          </span>
          <span>Марка №1 в России · Бренд года 2025</span>
        </div>
      </div>
    </footer>
  )
}
