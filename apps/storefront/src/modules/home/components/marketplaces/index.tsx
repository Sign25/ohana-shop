import { BUSINESS_TOOLS, MARKETPLACES } from "@/lib/util/marketplaces"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"

/** Главная: инструменты для бизнеса + «Мы на маркетплейсах» (Ozon, Яндекс Маркет, Wildberries) */
const Marketplaces = () => (
  <div className="content-container flex flex-col gap-8 py-6">
    <section>
      <h2 className="oh-h mb-4 text-[28px]">Инструменты для бизнеса</h2>
      <ul className="grid grid-cols-1 gap-3 small:grid-cols-3">
        {BUSINESS_TOOLS.map((t) => (
          <li key={t.href}>
            <LocalizedClientLink href={t.href} className="oh-card flex h-full flex-col gap-1 p-4 transition-colors hover:border-oh-azure">
              <span className="text-[16px] font-semibold text-oh-ink">{t.label} <span className="text-oh-azure">→</span></span>
              <span className="text-[13px] text-oh-graphite">{t.text}</span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="oh-h text-[28px]">Мы на маркетплейсах</h2>
        <span className="text-[13px] text-oh-graphite">Розница и проверка спроса — там; опт по ценам производителя — здесь</span>
      </div>
      <ul className="grid grid-cols-1 gap-3 small:grid-cols-3">
        {MARKETPLACES.map((m) => (
          <li key={m.key}>
            <a href={m.href} target="_blank" rel="noopener nofollow" className="oh-card flex items-center gap-4 p-4 transition-colors hover:border-oh-azure">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[20px] font-bold text-white" style={{ background: m.color }}>{m.name[0]}</span>
              <span className="flex flex-col">
                <span className="text-[16px] font-semibold text-oh-ink">{m.name}</span>
                <span className="text-[12.5px] text-oh-graphite">{m.note}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
)

export default Marketplaces
