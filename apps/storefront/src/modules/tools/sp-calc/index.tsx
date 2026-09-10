"use client"

import { CalcProduct } from "@/lib/data/bizcalc"
import { formatRub, KRUPNY_THRESHOLD, OPT_THRESHOLD } from "@/lib/util/ohana"
import ProductPicker from "@/modules/tools/product-picker"
import { clx } from "@medusajs/ui"
import { useMemo, useState } from "react"

const fmt = (v: number) => Math.round(v).toLocaleString("ru-RU")
const num = (v: string) => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0 }
const inp = "h-11 w-full rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15"

/** Калькулятор 1: выгода участника СП (опт + оргсбор против розницы) */
export const SpMemberCalc = () => {
  const [cur, setCur] = useState<CalcProduct | null>(null)
  const [opt, setOpt] = useState(""), [retail, setRetail] = useState(""), [org, setOrg] = useState("15"), [kr, setKr] = useState(false)
  const [chip, setChip] = useState<{ text: string; manual?: boolean } | null>(null)

  const pick = (p: CalcProduct) => {
    setCur(p); setOpt(String(kr && p.krupny ? p.krupny : p.opt))
    if (p.rrc) { setRetail(String(p.rrc)); setChip({ text: "розничная цена из 1С" }) } else { setRetail(""); setChip({ text: "розницу не нашли — введите вручную", manual: true }) }
  }
  const toggleKr = (v: boolean) => { setKr(v); if (cur) setOpt(String(v && cur.krupny ? cur.krupny : cur.opt)) }

  const r = useMemo(() => {
    const o = num(opt), w = num(retail), g = num(org), member = o * (1 + g / 100)
    if (!o) return null
    if (!w) return { member, o, g, save: null as number | null, sp: 0, top: member, w: 0, maxOrg: 0 }
    return { member, o, g, save: w - member, sp: ((w - member) / w) * 100, top: Math.max(member, w), w, maxOrg: (w / o - 1) * 100 }
  }, [opt, retail, org])

  return (
    <div className="grid gap-5 small:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-oh-muted">Найдите товар — цены подставятся сами. Вам останется только задать оргсбор.</p>
        <ProductPicker onPick={pick} placeholder="Название или артикул: брюки, 15100…" />
        {cur && (
          <div className="flex items-center gap-3 rounded-lg bg-oh-paper p-3">
            {cur.img && <img src={cur.img} alt="" className="h-14 w-11 rounded object-cover" />}
            <div className="min-w-0 text-[13px]">
              <div className="truncate font-medium text-oh-ink">{cur.name}</div>
              <div className="text-oh-muted">арт. {cur.code} · в наличии {cur.stock} шт</div>
              <div>опт <b>{fmt(cur.opt)} ₽</b>{cur.krupny < cur.opt ? <> · от {fmt(KRUPNY_THRESHOLD)} ₽ — <b>{fmt(cur.krupny)} ₽</b></> : null}</div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Опт-цена, ₽/шт</span><input type="number" min={0} value={opt} onChange={(e) => setOpt(e.target.value)} className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Розница, ₽/шт</span><input type="number" min={0} value={retail} onChange={(e) => { setRetail(e.target.value); setChip(null) }} className={inp} />
            {chip && <span className={clx("self-start rounded-pill px-2 py-0.5 text-[11px]", chip.manual ? "bg-oh-beige text-oh-graphite" : "bg-oh-mint-deep/15 text-oh-mint-deep")}>{chip.text}</span>}</label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-oh-graphite">Ваш оргсбор — <b className="text-oh-ink">{org}%</b></span>
          <input type="range" min={0} max={40} step={0.5} value={org} onChange={(e) => setOrg(e.target.value)} className="accent-oh-azure" />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-oh-graphite"><input type="checkbox" checked={kr} onChange={(e) => toggleKr(e.target.checked)} className="h-4 w-4 accent-oh-azure" /> Закупка от {fmt(KRUPNY_THRESHOLD)} ₽ — считать по цене крупного опта</label>
      </div>
      <div className="rounded-card bg-oh-beige/70 p-5" aria-live="polite">
        {!r ? (
          <p className="text-[14px] text-oh-graphite">Выберите товар из каталога — покажем, сколько сэкономит участник вашей закупки.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {r.save !== null && (r.save >= 0 ? <span className="self-start rounded-pill bg-oh-mint-deep px-3 py-1 text-[12px] font-medium text-white">выгоднее розницы на {r.sp.toFixed(0)}%</span> : <span className="self-start rounded-pill bg-oh-primary px-3 py-1 text-[12px] font-medium text-white">дороже розницы — снизьте оргсбор</span>)}
            <div className="text-[28px] font-semibold leading-none text-oh-ink">{fmt(r.member)} ₽ <span className="text-[13px] font-normal text-oh-muted">/шт для участника</span></div>
            <div className="text-[13px] text-oh-graphite">опт {fmt(r.o)} ₽ + оргсбор {fmt(r.member - r.o)} ₽ ({r.g}%)</div>
            {r.w > 0 && (
              <div className="mt-2 flex flex-col gap-2 text-[12px] text-oh-graphite">
                <div><div className="flex justify-between"><span>в вашей закупке</span><span>{fmt(r.member)} ₽</span></div><div className="h-2 rounded-pill bg-white"><i className="block h-2 rounded-pill bg-oh-azure" style={{ width: `${Math.max(4, (r.member / r.top) * 100)}%` }} /></div></div>
                <div><div className="flex justify-between"><span>в розницу</span><span>{fmt(r.w)} ₽</span></div><div className="h-2 rounded-pill bg-white"><i className="block h-2 rounded-pill bg-oh-gold" style={{ width: `${Math.max(4, (r.w / r.top) * 100)}%` }} /></div></div>
              </div>
            )}
            <p className="mt-1 text-[12.5px] text-oh-graphite">
              {r.save === null ? "Укажите розничную цену — покажем экономию участника и потолок оргсбора." : r.save >= 0 ? <>Участник экономит <b>{fmt(r.save)} ₽</b> с каждой вещи. Потолок оргсбора для этой модели — {r.maxOrg.toFixed(0)}%: до него закупка не дороже розницы.{!kr && cur && cur.krupny < cur.opt ? ` От ${fmt(KRUPNY_THRESHOLD)} ₽ опт-цена — ${fmt(cur.krupny)} ₽: выгода ещё больше.` : ""}</> : null}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Калькулятор 2: доход организатора */
export const SpOrgCalc = () => {
  const [f, setF] = useState({ sum: "35000", org: "15", exp: "0", n: "2" })
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const sum = num(f.sum), org = num(f.org), exp = num(f.exp), n = Math.max(1, Math.round(num(f.n) || 1))
  const per = (sum * org) / 100 - exp
  const sign = (v: number) => (sum ? `${v < 0 ? "−" : ""}${fmt(Math.abs(v))}` : "—")
  const hint = !sum ? "" : sum < OPT_THRESHOLD ? `До минимальной закупки не хватает ${fmt(OPT_THRESHOLD - sum)} ₽ (минимум — ${fmt(OPT_THRESHOLD)} ₽).` : sum < KRUPNY_THRESHOLD ? `Ещё ${fmt(KRUPNY_THRESHOLD - sum)} ₽ — и включится цена крупного опта: та же закупка станет дешевле, а ваша маржа выше.` : "Действует цена крупного опта — вы закупаетесь по минимальным ценам."
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 small:grid-cols-4">
        <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Сумма закупки, ₽</span><input type="number" min={0} step={1000} value={f.sum} onChange={(e) => set("sum", e.target.value)} className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Оргсбор, %</span><input type="number" min={0} max={100} step={0.5} value={f.org} onChange={(e) => set("org", e.target.value)} className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Ваши расходы на закупку, ₽</span><input type="number" min={0} step={100} value={f.exp} onChange={(e) => set("exp", e.target.value)} className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Закупок в месяц</span><input type="number" min={1} max={31} value={f.n} onChange={(e) => set("n", e.target.value)} className={inp} /></label>
      </div>
      <div className="h-2 rounded-pill bg-oh-line"><i className="block h-2 rounded-pill bg-oh-azure transition-all" style={{ width: `${Math.min(100, (sum / KRUPNY_THRESHOLD) * 100)}%` }} /></div>
      {hint && <p className={clx("text-[13px]", sum < OPT_THRESHOLD ? "text-oh-primary" : "text-oh-graphite")}>{hint}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[[sign(per), "доход с одной закупки, ₽"], [sign(per * n), "доход в месяц, ₽"], [sign(per * n * 12), "доход в год, ₽"]].map(([v, t], i) => (
          <div key={t} className="rounded-card bg-oh-paper p-4 text-center"><div className={clx("text-[22px] font-semibold", i === 2 ? "text-oh-azure" : "text-oh-ink")}>{v}</div><div className="text-[12px] text-oh-muted">{t}</div></div>
        ))}
      </div>
    </div>
  )
}
