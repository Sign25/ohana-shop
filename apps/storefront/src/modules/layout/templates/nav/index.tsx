import { retrieveCart } from "@/lib/data/cart"
import { listCategoryTree } from "@/lib/data/categories"
import { retrieveCustomer } from "@/lib/data/customer"
import { audienceLabel, visibleShowcases } from "@/lib/util/ohana"
import AccountButton from "@/modules/account/components/account-button"
import CartButton from "@/modules/cart/components/cart-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import FilePlus from "@/modules/common/icons/file-plus"
import CatalogMenu from "@/modules/layout/components/catalog-menu"
import TopBar from "@/modules/layout/components/top-bar"
import { RequestQuoteConfirmation } from "@/modules/quotes/components/request-quote-confirmation"
import { RequestQuotePrompt } from "@/modules/quotes/components/request-quote-prompt"
import SkeletonAccountButton from "@/modules/skeletons/components/skeleton-account-button"
import SkeletonCartButton from "@/modules/skeletons/components/skeleton-cart-button"
import Image from "next/image"
import { Suspense } from "react"

/**
 * Шапка Ohana: топ-панель (награды / сервисы / телефон), затем одна строка:
 * логотип | кнопка «Каталог» | поиск | запрос цены · кабинет · корзина,
 * и под ней текстовое меню аудиторий капсом (ЖЕНЩИНАМ / МУЖЧИНАМ / …) — как на ohanaopt.ru.
 */
export async function NavigationHeader() {
  const [customer, cart, categories] = await Promise.all([
    retrieveCustomer().catch(() => null),
    retrieveCart().catch(() => null),
    listCategoryTree().catch(() => []),
  ])
  const isShowcase = (c: any) => c.metadata?.kind === "showcase"
  const audiences = categories.filter((c) => !c.parent_category_id && !isShowcase(c))
  const showcases = visibleShowcases(categories)

  return (
    <div className="sticky top-0 inset-x-0 z-50 bg-white border-b border-oh-line">
      <TopBar />
      <header className="content-container">
        <div className="flex items-center gap-4 py-3">
          <LocalizedClientLink href="/" className="shrink-0" aria-label="Ohana Market — на главную">
            <Image src="/logo.png" alt="Ohana market" width={432} height={192} priority className="h-11 w-auto small:h-12" />
          </LocalizedClientLink>

          <div className="hidden small:block">
            <CatalogMenu categories={categories} />
          </div>

          <form action="/ru/store" method="get" className="relative flex-1 min-w-0">
            <input
              type="search"
              name="q"
              placeholder="Искать: халаты, пижамы, комплекты, артикул…"
              className="h-11 w-full rounded-pill border border-oh-line-2 bg-white pl-5 pr-12 text-sm text-oh-ink placeholder:text-oh-muted focus:border-oh-azure focus:outline-none"
              title="Поиск по каталогу"
            />
            <button type="submit" className="absolute right-1 top-1 h-9 w-9 rounded-full text-oh-graphite hover:text-oh-azure" aria-label="Найти">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mx-auto" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
          </form>

          <div className="flex items-center gap-1 shrink-0">
            {customer && cart?.items && cart.items.length > 0 ? (
              <RequestQuoteConfirmation>
                <button className="hidden medium:flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm hover:bg-oh-paper">
                  <FilePlus />
                  Запрос цены
                </button>
              </RequestQuoteConfirmation>
            ) : (
              <RequestQuotePrompt>
                <button className="hidden medium:flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm hover:bg-oh-paper">
                  <FilePlus />
                  Запрос цены
                </button>
              </RequestQuotePrompt>
            )}
            <Suspense fallback={<SkeletonAccountButton />}>
              <AccountButton customer={customer} />
            </Suspense>
            <Suspense fallback={<SkeletonCartButton />}>
              <CartButton />
            </Suspense>
          </div>
        </div>

        <nav className="hidden small:flex items-center gap-7 pb-3 text-[13px] font-medium uppercase tracking-[0.06em] text-oh-graphite">
          {audiences.map((c) => (
            <LocalizedClientLink key={c.id} href={`/categories/${c.handle}`} className="hover:text-oh-azure">
              {audienceLabel(c.name)}
            </LocalizedClientLink>
          ))}
          {showcases.slice(0, 2).map((c) => (
            <LocalizedClientLink key={c.id} href={`/categories/${c.handle}`} className="text-oh-primary hover:text-oh-primary-hover">
              {c.name}
            </LocalizedClientLink>
          ))}
          <a href="https://ohana.market/" className="ml-auto normal-case tracking-normal text-oh-muted hover:text-oh-azure">
            Розница ↗
          </a>
        </nav>
      </header>
    </div>
  )
}
