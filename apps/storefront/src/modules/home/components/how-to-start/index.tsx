import { PRICE_LIST_URL } from "@/lib/util/marketplaces"
import { STEPS } from "@/lib/util/home-content"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"

/** «Как начать работать с нами» — три шага и две кнопки (перенесено со старого сайта) */
const HowToStart = () => (
  <div className="content-container py-4">
    <section className="rounded-[20px] bg-oh-cream p-5 small:p-7">
      <h2 className="oh-h mb-4 text-[26px]">Как начать работать с нами</h2>
      <ol className="grid grid-cols-1 gap-3 small:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="overflow-hidden rounded-card bg-white">
            <div className="relative aspect-[3.6/1] w-full bg-oh-paper">
              <Image src={s.img} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="relative px-4 pb-4 pt-5">
              <span className="absolute -top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-oh-primary text-[14px] font-bold text-white shadow">{s.n}</span>
              <div className="text-[15px] font-semibold text-oh-ink">{s.title}</div>
              <div className="text-[13px] text-oh-graphite">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <LocalizedClientLink href="/account" className="oh-btn">Зарегистрироваться</LocalizedClientLink>
        <a href={PRICE_LIST_URL} className="oh-btn-ghost">Скачать прайс Excel</a>
        <LocalizedClientLink href="/bystryy-zakaz" className="oh-btn-ghost">Быстрый заказ</LocalizedClientLink>
      </div>
    </section>
  </div>
)

export default HowToStart
