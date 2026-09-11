import { listCategoryTree } from "@/lib/data/categories"
import { CONTACTS, SOCIALS } from "@/lib/util/home-content"
import { MARKETPLACES, PRICE_LIST_URL } from "@/lib/util/marketplaces"
import CallbackButton from "@/modules/layout/components/callback-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

const BUYERS = [
  { label: "Как сделать заказ", href: "/p/how-to-order" },
  { label: "Условия работы", href: "/p/conditions" },
  { label: "Доставка", href: "/p/delivery" },
  { label: "Оплата", href: "/p/payment" },
  { label: "Возврат и обмен", href: "/p/return" },
  { label: "Вопросы и ответы", href: "/p/faq" },
]
const TOOLS = [
  { label: "Быстрый заказ", href: "/bystryy-zakaz" },
  { label: "Прайс-лист Excel", href: PRICE_LIST_URL },
  { label: "Бизнес-калькулятор", href: "/biznes-s-ohanoy" },
  { label: "Подбор размера", href: "/podbor-razmera" },
  { label: "Совместные покупки", href: "/sovmestnye-pokupki" },
  { label: "Личный кабинет", href: "/account" },
]
const COMPANY = [
  { label: "О компании", href: "/p/about" },
  { label: "Награды", href: "/p/nagrady" },
  { label: "Сертификаты", href: "/p/sertificat" },
  { label: "Контакты", href: "/p/contacts" },
]
const LEGAL = [
  { label: "Реквизиты", href: "/p/requisites" },
  { label: "Договор-оферта", href: "/p/oferta" },
  { label: "Политика конфиденциальности", href: "/p/privacy-policy" },
]

const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
  href.startsWith("/") ? <LocalizedClientLink href={href} className={className}>{children}</LocalizedClientLink> : <a href={href} className={className}>{children}</a>

/**
 * Подвал: слева бренд (логотип, награды, соцсети), три колонки ссылок, справа карточка контактов с кнопкой звонка;
 * ниже — строка «Розница и маркетплейсы» и юридическая полоса. Спокойная бежевая подложка, лазурь для ссылок при наведении.
 */
export default async function Footer() {
  const categories = await listCategoryTree().catch(() => [])
  const roots = categories.filter((c) => !c.parent_category_id && !["showcase", "manual-hits"].includes(String((c.metadata as any)?.kind)))
  const col = "flex flex-col gap-2 text-[13.5px]"
  const link = "text-oh-graphite hover:text-oh-azure"
  const head = "mb-3 text-[12px] font-semibold uppercase tracking-[.08em] text-oh-muted"

  return (
    <footer className="mt-12 border-t border-oh-line bg-oh-paper">
      <div className="content-container grid grid-cols-1 gap-x-8 gap-y-10 py-12 small:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_1.4fr]">
        {/* бренд */}
        <div className="flex flex-col gap-5">
          <LocalizedClientLink href="/" className="w-fit"><Image src="/logo.png" alt="Ohana market" width={432} height={192} className="h-11 w-auto" /></LocalizedClientLink>
          <p className="max-w-[32ch] text-[13.5px] leading-relaxed text-oh-graphite">Одежда и домашний текстиль оптом напрямую от производителя из Омска. Собственное производство, отгрузка 24–48 часов, до терминала ТК — бесплатно.</p>
          <LocalizedClientLink href="/p/nagrady" className="flex w-fit items-center gap-2 rounded-pill border border-oh-line bg-white px-3 py-1.5 text-[12px] font-medium text-oh-ink hover:border-oh-azure">
            <Image src="/ui/marka1_logo.webp" alt="" width={18} height={18} /> Марка №1 в России <span className="text-oh-muted">·</span>
            <Image src="/ui/award_brand.webp" alt="" width={16} height={16} /> Бренд года 2025
          </LocalizedClientLink>
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a key={s.key} href={s.href} target="_blank" rel="noopener nofollow" aria-label={s.name} title={s.name} className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white transition-opacity hover:opacity-85" style={{ background: s.color }}>{s.key === "vk" ? "VK" : "OK"}</a>
            ))}
            <span className="text-[12.5px] text-oh-muted">мы в соцсетях</span>
          </div>
        </div>

        <div><div className={head}>Каталог</div><ul className={col}>{roots.map((c) => <li key={c.id}><LocalizedClientLink href={`/categories/${c.handle}`} className={link}>{c.name}</LocalizedClientLink></li>)}</ul></div>
        <div>
          <div className={head}>Покупателям</div>
          <ul className={col}>{BUYERS.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}</ul>
        </div>
        <div>
          <div className={head}>Инструменты</div>
          <ul className={col}>{TOOLS.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}</ul>
          <div className={`${head} mt-6`}>Компания</div>
          <ul className={col}>{COMPANY.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}</ul>
        </div>

        {/* контакты */}
        <div className="rounded-card border border-oh-line bg-white p-5">
          <div className={head}>Связаться с нами</div>
          <a href={CONTACTS.phoneHref} className="block text-[22px] font-semibold leading-none text-oh-ink hover:text-oh-azure">{CONTACTS.phone}</a>
          <div className="mt-1 text-[12.5px] text-oh-muted">{CONTACTS.hours} · звонок бесплатный</div>
          <a href={`mailto:${CONTACTS.email}`} className="mt-3 block text-[14px] font-medium text-oh-azure hover:underline">{CONTACTS.email}</a>
          <div className="mt-3 text-[13px] leading-snug text-oh-graphite">{CONTACTS.address}<br /><a href={CONTACTS.mapHref} target="_blank" rel="noopener nofollow" className="text-oh-azure hover:underline">показать на карте</a></div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]"><CallbackButton /><span className="text-oh-muted">или напишите — ответим в рабочее время</span></div>
        </div>
      </div>

      <div className="border-t border-oh-line">
        <div className="content-container flex flex-col gap-3 py-4 small:flex-row small:items-center small:justify-between">
          <div className="text-[13px]"><span className="font-semibold text-oh-ink">Розница и маркетплейсы</span><span className="text-oh-muted"> · официальные магазины Ohana Market</span></div>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACES.map((m) => (
              <a key={m.key} href={m.href} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-2 rounded-pill border border-oh-line bg-white px-3 py-1.5 text-[13px] font-medium text-oh-ink hover:border-oh-azure">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />{m.name} <span className="text-oh-muted">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-oh-line bg-white/60">
        <div className="content-container flex flex-col gap-2 py-4 text-[12px] text-oh-muted small:flex-row small:items-center small:justify-between">
          <span>© 2018–{new Date().getFullYear()} {CONTACTS.company}. Оптовые поставки одежды и домашнего текстиля.</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">{LEGAL.map((l) => <LocalizedClientLink key={l.href} href={l.href} className="hover:text-oh-azure">{l.label}</LocalizedClientLink>)}</span>
        </div>
      </div>
    </footer>
  )
}
