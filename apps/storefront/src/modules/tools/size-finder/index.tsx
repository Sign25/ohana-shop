"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { clx } from "@medusajs/ui"
import { useMemo, useState } from "react"

/** Подбор российского размера по меркам: взрослые — по обхватам (ГОСТ), дети — по росту. Логика перенесена со старого сайта. */
const RU = [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64]
const INTL = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"]
const CH = [88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128]
const WA = [68, 72, 76, 80, 85, 90, 95, 100, 105, 110, 115]
const HI = [94, 98, 102, 106, 110, 114, 118, 122, 126, 130, 134]
const KH = [98, 104, 110, 116, 122, 128, 134, 140, 146]
const KCH = [56, 58, 60, 62, 64, 67, 70, 73, 76]
const KWA = [51, 52, 53, 54, 56, 58, 61, 64, 67]
const PL = [100, 101, 101, 102, 102, 103, 103, 104, 104, 105, 105]
const SH = [38.5, 39.2, 39.9, 40.6, 41.3, 42, 42.7, 43.4, 44.1, 44.8, 45.5]
const CAT: Record<string, string> = { w: "zhenskaya-odezhda", m: "muzhskaya-odezhda", g: "odezhda-dlya-devochek", b: "odezhda-dlya-malchikov" }
const SEGS = [["w", "Женщинам"], ["m", "Мужчинам"], ["g", "Девочкам"], ["b", "Мальчикам"]] as const

const near = (v: number, arr: number[]) => { for (let i = 0; i < arr.length - 1; i++) if (v < (arr[i] + arr[i + 1]) / 2) return i; return arr.length - 1 }
const rng = (arr: number[], i: number) => { const lo = i === 0 ? arr[0] - 2 : (arr[i - 1] + arr[i]) / 2, hi = i === arr.length - 1 ? arr[i] + 2 : (arr[i] + arr[i + 1]) / 2; return `${Math.round(lo)}–${Math.round(hi)}` }
const num = (v?: string) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n }

type Line = { label: string; ru: number; intl: string; hint?: string }
type Result = { lines: Line[]; notes: string[]; size: string | null; sizeKeys: string } | { message: string }

function calcAdult(f: Record<string, string>): Result {
  const ch = num(f.chest), wa = num(f.waist), hi = num(f.hips); let h = num(f.height)
  const sh = num(f.shoulder), sl = num(f.sleeve), ins = num(f.inseam)
  if (ch === null && wa === null && hi === null && h === null) return { message: "" }
  if (ch === null) return { message: "Укажите обхват груди — это основная мерка. Талия, бёдра и рост уточнят результат." }
  if (ch < 60 || ch > 180) return { message: "Проверьте обхват груди — обычно это 60–180 см." }
  const notes: string[] = []; let hFromIns = false
  if (h === null && ins !== null && ins >= 55 && ins <= 100) { h = Math.round(ins / 0.45); hFromIns = true; notes.push(`Рост оценили по внутреннему шву — примерно ${h} см.`) }
  else if (h === null && sl !== null && sl >= 40 && sl <= 80) { h = Math.round(sl / 0.35); notes.push(`Рост оценили по длине рукава — примерно ${h} см.`) }
  let top = near(ch, CH)
  if (sh !== null && sh >= 30 && sh <= 60) {
    const iS = near(sh, SH)
    if (iS - top >= 1) notes.push(`По ширине плеч (${sh} см) ближе RU ${RU[iS]} — при развитых плечах верх берите на размер больше.`)
    else if (top - iS >= 2) notes.push("Плечи уже типовых для вашего размера — в плечах изделие сядет свободнее.")
  }
  if (sl !== null && h !== null && sl >= 40 && sl <= 80) {
    const typ = Math.round(h * 0.35)
    if (sl - typ >= 3) notes.push(`Руки длиннее типовых для роста (рукав ≈ ${typ} см) — сверяйте длину рукава в характеристиках модели.`)
    else if (typ - sl >= 3) notes.push(`Рукав изделия может оказаться длинноват — типовой для вашего роста ≈ ${typ} см.`)
  }
  if (ins !== null && h !== null && !hFromIns && ins >= 55 && ins <= 100) {
    const typ = Math.round(h * 0.45)
    if (Math.abs(ins - typ) >= 3) notes.push(`Длина ног отличается от типовой для роста (внутренний шов ≈ ${typ} см) — проверьте длину брюк в характеристиках.`)
  }
  const iW = wa !== null ? near(wa, WA) : -1, iH = hi !== null ? near(hi, HI) : -1
  let bottom = Math.max(iW, iH)
  if (f.fit === "loose") {
    if (top < RU.length - 1) top++
    if (bottom >= 0 && bottom < RU.length - 1) bottom++
    notes.push("Выбрана свободная посадка — рекомендуем на размер больше расчётного.")
  }
  const lines: Line[] = []; let main = top
  if (bottom >= 0 && bottom > top) {
    lines.push({ label: "Верх (футболки, халаты, пижамы)", ru: RU[top], intl: INTL[top], hint: `грудь ${rng(CH, top)} см` })
    lines.push({ label: "Низ (брюки, шорты)", ru: RU[bottom], intl: INTL[bottom], hint: `талия ${rng(WA, bottom)} см` })
    notes.push(`Талия или бёдра на ${bottom - top} разм. больше, чем грудь: поясные изделия берите по нижней мерке, цельные (халаты, платья) — RU ${RU[bottom]}.`)
    main = bottom
  } else {
    lines.push({ label: "Ваш размер", ru: RU[top], intl: INTL[top], hint: `грудь ${rng(CH, top)} см` })
    if (bottom >= 0 && bottom < top) notes.push(`По талии и бёдрам подходит и меньший (RU ${RU[bottom]}), но верх выбирают по груди — берите RU ${RU[top]}.`)
  }
  if (h !== null && h >= 120 && h <= 220) {
    const pi = bottom >= 0 ? bottom : top, plen = PL[pi] + Math.round(((h - 173) / 6) * 2)
    notes.push(`Брюки RU ${RU[pi]} для роста ${h} см: длина по боковому шву ≈ ${plen} см.`)
  }
  if (ch > CH[CH.length - 1] + 2) notes.push("Обхват груди больше основной сетки — смотрите модели с бейджем «Big size».")
  else if (ch < CH[0] - 2) notes.push("Обхват груди меньше 44 размера — берите RU 44 (S), самый маленький во взрослой сетке.")
  else if (ch > CH[top] + 1 && top < RU.length - 1) notes.push(`Значение у верхней границы размера. Любите посвободнее — берите следующий, RU ${RU[top + 1]}.`)
  if (h !== null) {
    if (h > 188) notes.push("Рост выше типового (до 188 см) — проверьте длину изделия в характеристиках модели.")
    else if (h < 155 && h >= 120) notes.push("Рост ниже типового — изделие может оказаться длинновато.")
  }
  return { lines, notes, size: String(RU[main]), sizeKeys: String(RU[main]) }
}

function calcKid(f: Record<string, string>): Result {
  let h = num(f.kheight); const age = f.kage, ch = num(f.kchest), wa = num(f.kwaist)
  const notes: string[] = []
  if (h === null && age) { h = KH[parseInt(age, 10) - 3]; notes.push(`Рост взяли типовой для ${age} лет — по фактическому росту расчёт точнее.`) }
  if (h === null) return { message: ch === null && wa === null ? "" : "Укажите рост ребёнка или выберите возраст." }
  if (h < 80 || h > 170) return { message: "Проверьте рост — детская сетка рассчитана примерно на 92–150 см." }
  if (h > 149) return { lines: [{ label: "Подойдёт взрослая сетка", ru: 44, intl: "S" }], notes: ["Рост уже больше детского 146 — переключитесь на взрослый раздел и посчитайте по обхвату груди."], size: null, sizeKeys: "" }
  let i = 0; while (i < KH.length - 1 && KH[i] < h) i++
  if (ch !== null) { const j = near(ch, KCH); if (j > i) { i = j; notes.push("По обхвату груди подходит больший размер — взяли его: ребёнку не должно быть тесно.") } }
  if (wa !== null) { const k = near(wa, KWA); if (k > i) { i = k; notes.push("По обхвату талии подходит больший размер — важно для брюк и шорт.") } }
  if (KH[i] - h <= 2 && i < KH.length - 1) notes.push(`Рост вплотную к границе размера — есть смысл взять ${KH[i + 1]} на вырост.`)
  notes.push("Дети быстро растут: сомневаетесь между двумя размерами — берите больший.")
  const age0 = i + 3
  // в каталоге детские размеры и одиночные («122»), и парные («122-128»)
  return { lines: [{ label: "Размер (рост)", ru: KH[i], intl: `≈ ${age0} ${age0 < 5 ? "года" : "лет"}` }], notes, size: String(KH[i]), sizeKeys: `${KH[i]},${KH[i]}-${KH[i] + 6}` }
}

const Field = ({ label, k, f, set, ph, min, max }: { label: string; k: string; f: Record<string, string>; set: (k: string, v: string) => void; ph?: string; min?: number; max?: number }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[13px] text-oh-graphite">{label}</span>
    <input type="number" inputMode="decimal" min={min} max={max} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="h-11 rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink placeholder:text-oh-muted/60 focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15" />
  </label>
)

const SizeFinder = () => {
  const [seg, setSeg] = useState<"w" | "m" | "g" | "b">("w")
  const [f, setF] = useState<Record<string, string>>({ fit: "normal", kage: "" })
  const [more, setMore] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const isKid = seg === "g" || seg === "b"
  const r = useMemo(() => (isKid ? calcKid(f) : calcAdult(f)), [f, isKid])
  const sel = "h-11 rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink focus:border-oh-azure focus:outline-none"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {SEGS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={seg === k} onClick={() => setSeg(k)} className={clx("h-10 rounded-pill border px-4 text-[14px] font-medium", seg === k ? "border-oh-azure bg-oh-azure text-white" : "border-oh-line-2 bg-white text-oh-ink hover:border-oh-azure hover:text-oh-azure")}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 small:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {!isKid ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Обхват груди, см *" k="chest" f={f} set={set} ph="например, 96" min={60} max={180} />
                <Field label="Обхват талии, см" k="waist" f={f} set={set} ph="необязательно" min={50} max={170} />
                <Field label="Обхват бёдер, см" k="hips" f={f} set={set} ph="необязательно" min={60} max={180} />
                <Field label="Рост, см" k="height" f={f} set={set} ph="необязательно" min={120} max={220} />
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] text-oh-graphite">Посадка</span>
                  <select value={f.fit} onChange={(e) => set("fit", e.target.value)} className={sel}><option value="normal">Обычная</option><option value="loose">Свободная</option></select>
                </label>
              </div>
              <button type="button" onClick={() => setMore((v) => !v)} className="self-start text-[13px] text-oh-azure hover:underline">
                {more ? "− Скрыть дополнительные мерки" : "+ Дополнительные мерки (плечи, рукав, внутренний шов)"}
              </button>
              {more && (
                <div className="grid grid-cols-2 gap-3 small:grid-cols-3">
                  <Field label="Ширина плеч, см" k="shoulder" f={f} set={set} min={30} max={60} />
                  <Field label="Длина рукава, см" k="sleeve" f={f} set={set} min={40} max={80} />
                  <Field label="Внутренний шов, см" k="inseam" f={f} set={set} min={55} max={100} />
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Рост ребёнка, см *" k="kheight" f={f} set={set} ph="например, 122" min={80} max={170} />
              <label className="flex flex-col gap-1">
                <span className="text-[13px] text-oh-graphite">Или возраст, лет</span>
                <select value={f.kage} onChange={(e) => set("kage", e.target.value)} className={sel}>
                  <option value="">—</option>
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <Field label="Обхват груди, см" k="kchest" f={f} set={set} ph="необязательно" min={40} max={90} />
              <Field label="Обхват талии, см" k="kwaist" f={f} set={set} ph="необязательно" min={35} max={80} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="min-h-[120px] rounded-card bg-oh-beige/70 p-4" aria-live="polite">
            {"message" in r ? (
              <p className="text-[14px] text-oh-graphite">{r.message || "Введите мерки — размер посчитается автоматически. Взрослому достаточно обхвата груди, ребёнку — роста или возраста."}</p>
            ) : (
              <>
                {r.lines.map((l) => (
                  <div key={l.label} className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[14px] text-oh-graphite">
                    <span>{l.label}:</span>
                    <b className="text-[26px] leading-none text-oh-ink">{l.ru}</b>
                    <span className="rounded-pill bg-white px-2 py-0.5 text-[12px] text-oh-azure">{l.intl}</span>
                    {l.hint && <small className="text-oh-muted">{l.hint}</small>}
                  </div>
                ))}
                {r.notes.length > 0 && (
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[12.5px] text-oh-graphite">
                    {r.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
          {!("message" in r) && r.size && (
            <LocalizedClientLink href={`/categories/${CAT[seg]}?size=${encodeURIComponent(r.sizeKeys)}&stock=any`} className="oh-btn text-center">
              Показать товары размера {r.size} →
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </div>
  )
}

export default SizeFinder
