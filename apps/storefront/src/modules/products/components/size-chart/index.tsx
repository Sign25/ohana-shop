"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { clx } from "@medusajs/ui"
import { useState } from "react"

/** Вкладка «Таблица размеров» — сетки со старого сайта: взрослые, брюки и шорты, детские по росту */
const TABS = [
  { key: "adult", label: "Взрослые размеры", rows: [
    ["Российский размер RU", [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64]],
    ["Международный", ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"]],
    ["Обхват груди, см", [88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128]],
    ["Обхват талии, см", [68, 72, 76, 80, 85, 90, 95, 100, 105, 110, 115]],
    ["Обхват бёдер, см", [94, 98, 102, 106, 110, 114, 118, 122, 126, 130, 134]],
  ], note: "" },
  { key: "pants", label: "Брюки и шорты", rows: [
    ["Российский размер RU", [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64]],
    ["Международный", ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"]],
    ["Обхват талии, см", [68, 72, 76, 80, 85, 90, 95, 100, 105, 110, 115]],
    ["Обхват бёдер, см", [94, 98, 102, 106, 110, 114, 118, 122, 126, 130, 134]],
    ["Длина брюк по боковому шву, см", [100, 101, 101, 102, 102, 103, 103, 104, 104, 105, 105]],
    ["Длина шорт по боковому шву, см", [46, 46, 47, 47, 48, 48, 49, 49, 50, 50, 51]],
  ], note: "Поясные изделия выбирайте по обхвату талии и бёдер — если мерки попадают в разные размеры, берите больший. Длины даны для роста 170–176 см: на каждые ±6 см роста длина брюк меняется примерно на ±2 см." },
  { key: "kids", label: "Детские (по росту)", rows: [
    ["Размер (рост), см", [98, 104, 110, 116, 122, 128, 134, 140, 146]],
    ["Возраст, лет", [3, 4, 5, 6, 7, 8, 9, 10, 11]],
    ["Обхват груди, см", [56, 58, 60, 62, 64, 67, 70, 73, 76]],
    ["Обхват талии, см", [51, 52, 53, 54, 56, 58, 61, 64, 67]],
  ], note: "" },
] as const

const SizeChart = ({ kids }: { kids?: boolean }) => {
  const [tab, setTab] = useState<string>(kids ? "kids" : "adult")
  const t = TABS.find((x) => x.key === tab) || TABS[0]
  return (
    <div className="flex flex-col gap-3 py-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button key={x.key} type="button" onClick={() => setTab(x.key)} className={clx("h-9 rounded-pill border px-3 text-[13px] font-medium", tab === x.key ? "border-oh-azure bg-oh-azure text-white" : "border-oh-line-2 bg-white text-oh-ink hover:border-oh-azure")}>{x.label}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] tabular-nums">
          <tbody>
            {t.rows.map(([label, vals], i) => (
              <tr key={String(label)} className={clx(i === 0 ? "bg-oh-azure text-white" : "border-b border-oh-line")}>
                <th className={clx("whitespace-nowrap px-3 py-2 text-left font-medium", i === 0 ? "" : "bg-oh-paper text-oh-graphite")}>{label}</th>
                {(vals as (string | number)[]).map((v, j) => <td key={j} className="px-3 py-2 text-center">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.note && <p className="text-[12.5px] text-oh-graphite">{t.note}</p>}
      <p className="text-[13px] text-oh-graphite"><b>Как снять мерки:</b> измеряйте сантиметровой лентой по нижнему белью, не натягивая ленту. Если значение между размерами — берите больший: домашняя одежда не должна стеснять движения.</p>
      <p className="text-[12.5px] text-oh-muted">Размеры указаны для ориентира, возможны отклонения ±1–2 см в зависимости от модели; точные обмеры — в характеристиках («Размер»).{" "}
        <LocalizedClientLink href="/podbor-razmera" className="font-medium text-oh-azure hover:underline">Подобрать размер по меркам →</LocalizedClientLink>
      </p>
    </div>
  )
}

export default SizeChart
