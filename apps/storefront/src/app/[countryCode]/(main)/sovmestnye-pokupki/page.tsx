import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { SpMemberCalc, SpOrgCalc } from "@/modules/tools/sp-calc"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Совместные покупки одежды оптом от производителя",
  description: "Совместные покупки с Ohana Market: оптовые цены открыты для всех, товары поштучно по размерам, закупка от 35 000 ₽, от 100 000 ₽ — крупный опт автоматически. Калькуляторы выгоды участника и дохода организатора.",
}

const WHY = [
  ["Опт без посредников", "Цены производителя из Омска. Мелкий опт от 35 000 ₽, крупный — от 100 000 ₽ со скидкой автоматически."],
  ["Поштучно по размерам", "Каждый участник берёт свой размер. Никаких обязательных рядов и линеек."],
  ["Оплата картой онлайн", "Оплачиваете закупку банковской картой прямо на сайте — быстро и с чеком."],
  ["Доставка ТК по всей России", "ПЭК, Деловые Линии, СДЭК, Почта России. До терминала ТК в Омске — бесплатно, дальше по тарифу ТК при получении."],
  ["Живые остатки", "Наличие на сайте — это реальный склад. Синхронизация с 1С каждый час: не будет «извините, не приехало»."],
  ["Фото для вашего каталога", "Используйте фотографии и описания с сайта в своих альбомах и чатах закупки."],
]
const STEPS = [
  ["Соберите заявки", "Выложите участникам фото из каталога. Минимальная сумма закупки — 35 000 ₽."],
  ["Оформите заказ", "На странице товара количество вбивается сразу по всем размерам. От 100 000 ₽ цены пересчитаются в крупный опт автоматически."],
  ["Оплатите картой", "Совместные покупки оплачиваются банковской картой онлайн — оплата по счёту для СП недоступна."],
  ["Получите в ТК", "Отгрузим выбранной транспортной компанией. Доставку оплачиваете при получении по тарифу ТК."],
]
const FAQ = [
  ["Нужна ли регистрация или подтверждение статуса организатора?", "Нет. Оптовые цены на сайте открыты для всех, специальный статус не требуется. Зарегистрируйтесь, чтобы видеть историю заказов в личном кабинете."],
  ["Можно ли оплатить закупку по счёту от ИП/ООО?", "Для совместных покупок — нет: оплата только банковской картой онлайн на сайте. Безналичная оплата по счёту доступна оптовым клиентам вне формата СП — напишите менеджеру."],
  ["Можно ли собирать одну закупку из разных категорий?", "Да, в один заказ можно положить женское, мужское, детское и текстиль — минималка и порог крупного опта считаются от общей суммы корзины."],
  ["Что с браком и пересортом?", "Проверяйте вложение при получении. Брак и пересорт компенсируем или заменяем в следующей отгрузке — свяжитесь с менеджером с фото и номером заказа."],
  ["Откуда в калькуляторе розничные цены?", "Розничные цены подтягиваются из нашей учётной системы. Показываем цену «от», без учёта персональных скидок маркетплейсов, поэтому реальная выгода участника обычно ещё выше расчётной."],
]

export default function SpPage() {
  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <ul className="flex items-center gap-x-2 text-[13px] text-oh-muted">
          <li><LocalizedClientLink href="/" className="hover:text-oh-azure">Главная</LocalizedClientLink></li><li>›</li><li className="text-oh-graphite">Совместные покупки</li>
        </ul>
        <section className="oh-card p-5 small:p-8">
          <h1 className="oh-h text-[30px]">Совместные покупки с Оханой</h1>
          <p className="mt-2 max-w-[760px] text-[15px] leading-relaxed text-oh-graphite">Организуете СП? У нас оптовые цены открыты для всех: собирайте закупку от <b className="text-oh-primary">35 000 ₽</b> — а от <b className="text-oh-primary">100 000 ₽</b> автоматически включается цена крупного опта. Товары продаются <b>поштучно по размерам</b> — не нужно собирать ряды и уговаривать участников на «лишние» размеры.</p>
          <h2 className="mt-6 text-[20px] font-semibold text-oh-ink">Почему организаторы выбирают Охану</h2>
          <div className="mt-3 grid gap-x-8 gap-y-4 small:grid-cols-3">
            {WHY.map(([t, d]) => <div key={t} className="border-l-2 border-oh-mint-deep pl-4"><b className="block text-[15px] text-oh-ink">{t}</b><span className="text-[13.5px] leading-relaxed text-oh-graphite">{d}</span></div>)}
          </div>
          <h2 className="mt-6 text-[20px] font-semibold text-oh-ink">Инструменты организатора</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <LocalizedClientLink href="/store?stock=any" className="oh-chip">Каталог с живыми остатками</LocalizedClientLink>
            <LocalizedClientLink href="/store?stock=full" className="oh-chip">Товары с полным размерным рядом</LocalizedClientLink>
            <LocalizedClientLink href="/podbor-razmera" className="oh-chip">Подбор размера для участников</LocalizedClientLink>
          </div>
        </section>

        <section className="oh-card p-5 small:p-8">
          <h2 className="text-[20px] font-semibold text-oh-ink">Калькулятор выгоды участника</h2>
          <p className="mb-4 text-[14px] text-oh-graphite">Покажите участникам их экономию.</p>
          <SpMemberCalc />
        </section>
        <section className="oh-card p-5 small:p-8">
          <h2 className="text-[20px] font-semibold text-oh-ink">Калькулятор дохода организатора</h2>
          <p className="mb-4 text-[14px] text-oh-graphite">Оргсбор минус расходы — ваш заработок. От 100 000 ₽ действует цена крупного опта: маржа выше при том же оргсборе.</p>
          <SpOrgCalc />
        </section>

        <section className="oh-card p-5 small:p-8">
          <h2 className="text-[20px] font-semibold text-oh-ink">Как проходит закупка</h2>
          <ol className="mt-3 grid gap-4 small:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t}><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-oh-azure text-[13px] font-semibold text-white">{i + 1}</span><b className="block text-[15px] text-oh-ink">{t}</b><span className="text-[13.5px] leading-relaxed text-oh-graphite">{d}</span></li>
            ))}
          </ol>
          <h2 className="mt-6 text-[20px] font-semibold text-oh-ink">Вопросы организаторов</h2>
          <div className="mt-2 divide-y divide-oh-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium text-oh-ink [&::-webkit-details-marker]:hidden">{q}<span className="text-oh-muted transition-transform group-open:rotate-45">+</span></summary>
                <p className="pt-2 text-[14px] leading-relaxed text-oh-graphite">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-5 text-[12.5px] text-oh-muted">Совместные покупки одежды оптом от производителя: женская, мужская и детская одежда из Омска поштучно по размерам. Мелкий опт от 35 000 ₽, крупный опт от 100 000 ₽, оплата картой, отгрузка транспортными компаниями по всей России. Ohana Market — прямые поставки для организаторов СП.</p>
        </section>
      </div>
    </div>
  )
}
