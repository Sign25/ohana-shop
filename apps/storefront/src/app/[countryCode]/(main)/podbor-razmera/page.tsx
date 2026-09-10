import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import SizeFinder from "@/modules/tools/size-finder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Подбор размера одежды по меркам",
  description: "Калькулятор размеров Ohana Market: введите обхваты или рост ребёнка — получите российский размер по ГОСТ-сетке и откройте товары своего размера.",
}

const IMG = "https://api.ohanaopt.ru/images/ohana_ui"
const Th = ({ children }: { children: React.ReactNode }) => <th className="whitespace-nowrap bg-oh-paper px-3 py-2 text-left font-medium text-oh-graphite">{children}</th>
const Row = ({ label, vals }: { label: string; vals: (string | number)[] }) => (
  <tr className="border-t border-oh-line"><Th>{label}</Th>{vals.map((v, i) => <td key={i} className="px-3 py-2 text-center text-oh-ink">{v}</td>)}</tr>
)

export default function SizeFinderPage() {
  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <ul className="flex items-center gap-x-2 text-[13px] text-oh-muted">
          <li><LocalizedClientLink href="/" className="hover:text-oh-azure">Главная</LocalizedClientLink></li><li>›</li><li className="text-oh-graphite">Подбор размера</li>
        </ul>
        <h1 className="oh-h text-[30px]">Калькулятор размеров одежды</h1>
        <p className="max-w-[760px] text-[15px] leading-relaxed text-oh-graphite">
          Две минуты — и вы знаете свой российский размер во всём каталоге Ohana Market. Введите мерки, получите размер и сразу откройте товары, которые подойдут. Считаем по ГОСТ-сеткам: взрослая — по обхватам, детская — по росту.
        </p>
        <div className="oh-card p-5 small:p-6"><SizeFinder /></div>

        <section className="oh-card p-5 small:p-6">
          <h2 className="mb-3 text-[20px] font-semibold text-oh-ink">Таблица размеров: взрослые</h2>
          <div className="overflow-x-auto"><table className="w-full text-[13px]">
            <tbody>
              <Row label="Российский размер RU" vals={[44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64]} />
              <Row label="Международный" vals={["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"]} />
              <Row label="Обхват груди, см" vals={[88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128]} />
              <Row label="Обхват талии, см" vals={[68, 72, 76, 80, 85, 90, 95, 100, 105, 110, 115]} />
              <Row label="Обхват бёдер, см" vals={[94, 98, 102, 106, 110, 114, 118, 122, 126, 130, 134]} />
            </tbody></table></div>
          <h2 className="mb-3 mt-6 text-[20px] font-semibold text-oh-ink">Таблица размеров: дети (по росту)</h2>
          <div className="overflow-x-auto"><table className="w-full text-[13px]">
            <tbody>
              <Row label="Размер (рост), см" vals={[98, 104, 110, 116, 122, 128, 134, 140, 146]} />
              <Row label="Возраст, лет ≈" vals={[3, 4, 5, 6, 7, 8, 9, 10, 11]} />
              <Row label="Обхват груди, см" vals={[56, 58, 60, 62, 64, 67, 70, 73, 76]} />
              <Row label="Обхват талии, см" vals={[51, 52, 53, 54, 56, 58, 61, 64, 67]} />
            </tbody></table></div>
          <p className="mt-3 text-[13px] text-oh-muted">Часть детской одежды продаётся парными размерами (например, 122-128) — калькулятор показывает и их.</p>
        </section>

        <section className="oh-card p-5 small:p-6">
          <h2 className="mb-3 text-[20px] font-semibold text-oh-ink">Как правильно снять мерки</h2>
          <div className="grid gap-5 small:grid-cols-[320px_1fr]">
            <img src={`${IMG}/sizechart_woman.webp`} alt="Как снять мерки для определения размера одежды" loading="lazy" className="w-full rounded-lg" />
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed text-oh-graphite">
              <li><b>Обхват груди</b> — сантиметровая лента проходит горизонтально по самым выступающим точкам груди и лопаткам. Не затягивайте ленту.</li>
              <li><b>Обхват талии</b> — по самому узкому месту туловища, живот расслаблен.</li>
              <li><b>Обхват бёдер</b> — по самым выступающим точкам ягодиц, ноги вместе.</li>
              <li><b>Рост</b> — без обуви, спиной к стене, от макушки до пола.</li>
              <li><b>Ширина плеч</b> — по спине, от края одного плеча до края другого.</li>
              <li><b>Длина рукава</b> — от плечевого сустава до запястья при слегка согнутой руке.</li>
              <li><b>Внутренний шов</b> — от паха до пола по внутренней стороне ноги.</li>
            </ol>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-oh-graphite">Измеряйтесь в тонкой одежде или без неё, лента прилегает к телу, но не давит. Если значение оказалось между двумя размерами — для домашней и трикотажной одежды берите больший: она рассчитана на свободную комфортную посадку. Оптовым покупателям калькулятор помогает быстро сориентироваться в размерных сетках при формировании заказа.</p>
        </section>
      </div>
    </div>
  )
}
