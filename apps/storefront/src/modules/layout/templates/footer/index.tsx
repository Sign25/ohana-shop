import { listCategoryTree } from "@/lib/data/categories"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** Служебные страницы пока живут на старом сайте — ссылки временные, до переноса разделов. */
const BUYERS = [
  { label: "Как начать работать", href: "https://ohanaopt.ru/biznes-s-ohanoy/" },
  { label: "Доставка и оплата", href: "https://ohanaopt.ru/faq/" },
  { label: "Возврат и обмен", href: "https://ohanaopt.ru/return/" },
  { label: "Вопросы и ответы", href: "https://ohanaopt.ru/faq/" },
  { label: "Подбор размера", href: "https://ohanaopt.ru/podbor-razmera/" },
  { label: "Совместные покупки", href: "https://ohanaopt.ru/sovmestnye-pokupki/" },
]
const COMPANY = [
  { label: "О компании", href: "https://ohanaopt.ru/about/" },
  { label: "Награды", href: "https://ohanaopt.ru/about/nagrady/" },
  { label: "Контакты", href: "https://ohanaopt.ru/contacts/" },
  { label: "Розничный магазин", href: "https://ohana.market/" },
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
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-oh-ink">Каталог</div>
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
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-oh-ink">Покупателям</div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {BUYERS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-oh-ink">Компания</div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {COMPANY.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-oh-graphite hover:text-oh-azure">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-oh-line">
        <div className="content-container flex flex-col gap-2 py-4 text-[12px] text-oh-muted small:flex-row small:items-center small:justify-between">
          <span>© {new Date().getFullYear()} Ohana Market. Оптовые поставки одежды и домашнего текстиля.</span>
          <span>Марка №1 в России · Бренд года 2025</span>
        </div>
      </div>
    </footer>
  )
}
