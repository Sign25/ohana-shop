import OrderCard from "@/modules/account/components/order-card"
import PreviouslyPurchasedProducts from "@/modules/account/components/previously-purchased"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { B2BCustomer } from "@/types/global"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: B2BCustomer | null
  orders: HttpTypes.StoreOrder[] | null
  region?: HttpTypes.StoreRegion | null
}

/** Обзор кабинета: что важно оптовику — последние заказы и быстрый повтор покупок */
const Overview = ({ customer, orders }: OverviewProps) => {
  const total = orders?.reduce((a, o) => a + (o.total || 0), 0) || 0
  return (
    <div className="flex flex-col gap-6" data-testid="overview-page-wrapper">
      <div>
        <h1 className="oh-h text-[30px]">Здравствуйте, {customer?.first_name}</h1>
        <p className="text-[13px] text-oh-graphite">
          {customer?.employee?.company?.name ? `${customer.employee.company.name} · ` : ""}
          {orders?.length || 0} заказов на {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(total)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 small:grid-cols-4">
        {[
          ["Каталог", "/store", "Новинки и вся линейка"],
          ["Корзина", "/cart", "Продолжить заказ"],
          ["Запросы цены", "/account/quotes", "Спеццены на объём"],
          ["Реквизиты", "/account/company", "Компания и сотрудники"],
        ].map(([t, href, d]) => (
          <LocalizedClientLink key={href} href={href} className="oh-card p-4 hover:border-oh-azure">
            <div className="text-[14px] font-semibold text-oh-ink">{t}</div>
            <div className="text-[12px] text-oh-muted">{d}</div>
          </LocalizedClientLink>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="oh-h text-[22px]">Последние заказы</h2>
          <LocalizedClientLink href="/account/orders" className="text-[13px] text-oh-azure hover:underline">Все заказы</LocalizedClientLink>
        </div>
        <div className="flex flex-col gap-2" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => <OrderCard order={order} key={order.id} />)
          ) : (
            <p className="text-[13px] text-oh-muted" data-testid="no-orders-message">Заказов пока нет. Соберите первый в каталоге: минимальная сумма 35 000 ₽.</p>
          )}
        </div>
      </section>

      {orders && orders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="oh-h text-[22px]">Вы уже заказывали</h2>
          <div className="flex flex-col gap-2" data-testid="previously-purchased-items-wrapper">
            <PreviouslyPurchasedProducts orders={orders} />
          </div>
        </section>
      )}
    </div>
  )
}

export default Overview
