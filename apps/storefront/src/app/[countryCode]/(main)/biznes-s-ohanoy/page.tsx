import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import BizCalc from "@/modules/tools/biz-calc"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Бизнес с Оханой — калькулятор прибыли магазина одежды",
  description: "Бесплатный калькулятор для предпринимателя: подберите ассортимент, задайте наценку — сервис посчитает выручку, прибыль и срок окупаемости закупки одежды оптом. Крупный опт от 100 000 ₽ автоматически.",
}

const PILLARS = [
  { t: "Работаем вдолгую", d: "Растём вместе с вами: чем увереннее идут продажи, тем крупнее закупка и выгоднее цена. Крупный опт включается автоматически — просить и торговаться не нужно." },
  { t: "Риски считаем за вас", d: "Прежде чем предложить позицию, смотрим спрос, сезон и остатки. В калькуляторе ниже — те же цифры, на которые ориентируемся сами: без приукрашенной маржи и забытой логистики." },
  { t: "Помощь — наша работа", d: "Подберём ассортимент под ваш канал продаж, поможем с доставкой и документами, подскажем, что берут в вашем регионе. Спрашивайте на любом этапе — это часть работы, а не одолжение." },
]

export default function BizPage() {
  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <ul className="flex items-center gap-x-2 text-[13px] text-oh-muted">
          <li><LocalizedClientLink href="/" className="hover:text-oh-azure">Главная</LocalizedClientLink></li><li>›</li><li className="text-oh-graphite">Бизнес с Оханой</li>
        </ul>
        <section className="oh-card p-5 small:p-8">
          <div className="text-[12px] font-medium uppercase tracking-wide text-oh-azure">Оптовое партнёрство</div>
          <h1 className="oh-h mt-1 text-[30px]">Ohana значит семья — и партнёров мы выбираем надолго</h1>
          <p className="mt-2 max-w-[760px] text-[15px] leading-relaxed text-oh-graphite">Разовая отгрузка нам не интересна. Мы в плюсе тогда, когда товар у вас продаётся и вы возвращаетесь за следующей партией — больше предыдущей. Поэтому показываем экономику как есть и не уговариваем взять то, что будет лежать.</p>
          <div className="mt-5 grid gap-4 small:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.t} className="border-l-2 border-oh-mint-deep pl-4"><b className="block text-[15px] text-oh-ink">{p.t}</b><span className="text-[13.5px] leading-relaxed text-oh-graphite">{p.d}</span></div>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-oh-muted">Ниже — калькулятор: выберите позиции, укажите наценку и канал продаж, и увидите закупку, доставку, рекомендуемые цены, прибыль и срок окупаемости. Расчёт ориентировочный и ни к чему не обязывает.</p>
        </section>
        <BizCalc />
      </div>
    </div>
  )
}
