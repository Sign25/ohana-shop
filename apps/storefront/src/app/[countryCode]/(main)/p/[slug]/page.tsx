import pages from "@/content/pages.json"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { Metadata } from "next"
import { notFound } from "next/navigation"

/**
 * Служебные страницы, перенесённые со старого сайта (src/content/pages.json — HTML + свои стили
 * как были в CS-Cart). Правятся в этом файле; ссылки на старый сайт остались только у разделов
 * с калькуляторами (бизнес с Оханой, подбор размера, совместные покупки) — их переносим отдельно.
 */
type Page = { title: string; page_title: string; meta: string; has_h1: boolean; html: string }
const PAGES = pages as Record<string, Page>

type Props = { params: Promise<{ countryCode: string; slug: string }> }

export async function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ countryCode: "ru", slug }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const page = PAGES[slug]
  if (!page) return { title: "Страница не найдена" }
  return { title: page.page_title.replace(/\s*[—|-]\s*Ohana Market.*$/i, ""), description: page.meta || undefined }
}

export default async function ContentPage(props: Props) {
  const { slug } = await props.params
  const page = PAGES[slug]
  if (!page) notFound()

  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <ul className="flex items-center gap-x-2 text-[13px] text-oh-muted">
          <li>
            <LocalizedClientLink href="/" className="hover:text-oh-azure">Главная</LocalizedClientLink>
          </li>
          <li>›</li>
          <li className="text-oh-graphite">{page.title}</li>
        </ul>
        {!page.has_h1 && <h1 className="oh-h text-[30px]">{page.title}</h1>}
        <article className="oh-card oh-prose oh-page p-5 text-[14px] leading-relaxed text-oh-graphite small:p-8" dangerouslySetInnerHTML={{ __html: page.html }} />
      </div>
    </div>
  )
}
