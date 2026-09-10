import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** Оформление заказа: спокойная шапка без меню, чтобы не уводить со страницы */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-2 w-full bg-white small:min-h-screen">
      <div className="border-b border-oh-line bg-white">
        <nav className="content-container flex h-16 items-center justify-between">
          <LocalizedClientLink href="/" aria-label="Ohana Market — на главную">
            <Image src="/logo.png" alt="Ohana market" width={432} height={192} className="h-10 w-auto" />
          </LocalizedClientLink>
          <div className="flex items-center gap-4 text-[13px] text-oh-graphite">
            <span className="hidden small:inline">Вопросы по заказу:</span>
            <a href="tel:+79914301730" className="font-semibold text-oh-ink hover:text-oh-azure">8 (991) 430-17-30</a>
          </div>
        </nav>
      </div>
      <div className="relative bg-oh-paper/60" data-testid="checkout-container">
        {children}
      </div>
      <div className="flex w-full items-center justify-center py-4 text-[12px] text-oh-muted">
        © {new Date().getFullYear()} Ohana Market · безналичный расчёт по счёту, заказ в работу после оплаты
      </div>
    </div>
  )
}
