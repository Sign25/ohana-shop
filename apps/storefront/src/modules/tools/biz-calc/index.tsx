"use client"

import { CalcProduct, spreadBySizes } from "@/lib/data/bizcalc"
import { addToCartBulk } from "@/lib/data/cart"
import { formatRub, KRUPNY_THRESHOLD } from "@/lib/util/ohana"
import ProductPicker from "@/modules/tools/product-picker"
import { clx } from "@medusajs/ui"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"

/**
 * Калькулятор экономики закупки («Бизнес с Оханой»): позиции из каталога, регион, канал продаж,
 * наценка, налоги → вложения, рекомендуемые цены, прибыль, окупаемость. Формулы перенесены со старого сайта.
 */
type Item = CalcProduct & { qty: number }
const ZONES = [
  ["0", "Омск — самовывоз / до ТК (бесплатно)"], ["15", "Сибирь · ~15 ₽/кг"], ["20", "Урал, Поволжье · ~20 ₽/кг"], ["25", "Центр, Москва, СПб · ~25 ₽/кг"],
  ["30", "Юг России · ~30 ₽/кг"], ["40", "Дальний Восток · ~40 ₽/кг"], ["35", "Казахстан, Беларусь · ~35 ₽/кг"],
]
const money = (n: number) => formatRub(Math.round(n))
const money2 = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
const inp = "h-11 w-full rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15"

const BizCalc = () => {
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [p, setP] = useState({ zone: "20", chan: "mp", markup: "100", fee: "20", mplog: "60", pack: "10", tax: "6", fix: "0", plan: "300" })
  const [adding, setAdding] = useState(false)
  const setp = (k: keyof typeof p, v: string) => setP((s) => ({ ...s, [k]: v }))
  const num = (v: string) => parseFloat(v) || 0

  const r = useMemo(() => {
    if (!items.length) return null
    let qtyTotal = 0, sumOpt = 0, sumKrupny = 0, weight = 0
    for (const it of items) { qtyTotal += it.qty; sumOpt += it.qty * it.opt; sumKrupny += it.qty * it.krupny; weight += it.qty * (it.weight || 0) }
    const isKrupny = sumOpt >= KRUPNY_THRESHOLD
    const purchase = isKrupny ? sumKrupny : sumOpt, saving = sumOpt - sumKrupny
    const rate = num(p.zone), delivery = rate === 0 ? 0 : Math.max(500, weight * rate)
    const markup = num(p.markup) / 100
    let fee = num(p.fee) / 100; if (p.chan === "direct") fee = 0
    const mplog = p.chan === "mp" ? num(p.mplog) : 0
    const pack = num(p.pack), fix = num(p.fix), plan = Math.max(1, parseInt(p.plan, 10) || 1)
    const deliveryPerUnit = qtyTotal ? delivery / qtyTotal : 0, deliveryPerKg = weight > 0 ? delivery / weight : 0
    const invested = purchase + delivery + pack * qtyTotal
    let revenue = 0
    const reco = items.map((it) => {
      const unitBuy = isKrupny ? it.krupny : it.opt
      const unitDelivery = (it.weight || 0) > 0 && deliveryPerKg > 0 ? it.weight * deliveryPerKg : deliveryPerUnit
      const unitCost = unitBuy + unitDelivery + pack, recoPrice = unitCost * (1 + markup)
      revenue += recoPrice * it.qty
      return { name: it.name, unitCost, recoPrice }
    })
    const feeCost = revenue * fee, mplogCost = mplog * qtyTotal, monthsToSell = qtyTotal / plan, fixTotal = fix * monthsToSell
    let tax = 0, vat = 0, profitTax = 0
    if (p.tax === "6") tax = revenue * 0.06
    if (p.tax === "15") tax = Math.max((revenue - invested - feeCost - mplogCost - fixTotal) * 0.15, revenue * 0.01) // минимальный налог УСН 1%
    if (p.tax === "osno") {
      // всё с НДС: закупка/доставка/комиссии дают вычет → НДС к уплате = 22/122 добавленной стоимости; прочие расходы без НДС
      const addedVal = revenue - invested - feeCost - mplogCost
      vat = Math.max(0, (addedVal * 22) / 122); profitTax = Math.max(0, (addedVal - vat - fixTotal) * 0.25); tax = vat + profitTax
    }
    const profit = revenue - invested - feeCost - mplogCost - fixTotal - tax
    const unitPrice = qtyTotal ? revenue / qtyTotal : 0, unitVar = unitPrice * fee + mplog + (p.tax === "6" ? unitPrice * 0.06 : 0)
    const beUnits = unitPrice - unitVar > 0 ? Math.ceil(invested / (unitPrice - unitVar)) : 0
    return { qtyTotal, sumOpt, isKrupny, purchase, saving, weight, delivery, packCost: pack * qtyTotal, invested, reco, revenue, feeCost, mplogCost, fixTotal, monthsToSell, tax, vat, profitTax, profit, profitUnit: qtyTotal ? profit / qtyTotal : 0, marginPct: revenue > 0 ? (profit / revenue) * 100 : 0, roiPct: invested > 0 ? (profit / invested) * 100 : 0, beUnits, monthlyProfit: profit / Math.max(monthsToSell, 0.01), plan }
  }, [items, p])

  const setQty = (id: string, v: number) => setItems((l) => l.map((it) => (it.id === id ? { ...it, qty: Math.max(it.step, Math.min(it.stock, Math.round(v / it.step) * it.step)) } : it)))
  const period = (m: number) => (m < 1 ? `${Math.ceil(m * 30)} дн.` : `${(Math.round(m * 10) / 10).toLocaleString("ru-RU")} мес.`)

  const addAll = async () => {
    setAdding(true)
    try {
      const lineItems = items.flatMap((it) => spreadBySizes(it, it.qty))
      if (lineItems.length) await addToCartBulk({ lineItems, countryCode })
      router.push(`/${countryCode}/cart`)
    } catch (e: any) {
      alert(e?.message || "Не получилось добавить в корзину")
      setAdding(false)
    }
  }

  const Line = ({ l, v, head, total, good }: { l: React.ReactNode; v?: React.ReactNode; head?: boolean; total?: boolean; good?: boolean }) =>
    head ? <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-oh-muted first:mt-0">{l}</div> : (
      <div className={clx("flex items-baseline justify-between gap-3 border-b border-oh-line py-1.5 text-[13.5px]", total && "border-b-0 text-[15px] font-semibold text-oh-ink")}>
        <span className="text-oh-graphite">{l}</span><b className={clx("text-right", good === true && "text-oh-mint-deep", good === false && "text-oh-primary")}>{v}</b>
      </div>
    )

  return (
    <div className="grid gap-4 small:grid-cols-[1fr_400px] small:items-start">
      <div className="flex flex-col gap-4">
        <section className="oh-card p-5">
          <h2 className="mb-3 text-[18px] font-semibold text-oh-ink">1. Подберите товары</h2>
          <ProductPicker onPick={(pr) => { if (items.length >= 10) return alert("Максимум 10 позиций"); setItems((l) => [...l, { ...pr, qty: pr.step }]) }} exclude={items.map((i) => i.id)} placeholder="Название или артикул — например: халат, 15100, полотенце…" />
          {items.length === 0 ? (
            <p className="mt-3 text-[13px] text-oh-muted">Добавьте до 10 позиций — количество можно менять в списке. Упаковки считаются кратно упаковке.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-oh-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2">
                  {it.img && <img src={it.img} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-oh-ink">{it.name}</div>
                    <div className="text-[12px] text-oh-muted">{money2(it.opt)}/шт{it.step > 1 ? ` · кратно ${it.step}` : ""} · до {it.stock} шт</div>
                  </div>
                  <input type="number" value={it.qty} min={it.step} step={it.step} max={it.stock} onChange={(e) => setQty(it.id, parseInt(e.target.value, 10) || it.step)} aria-label="Количество" className="h-10 w-[84px] rounded-lg border border-oh-line-2 px-2 text-center text-[14px]" />
                  <div className="w-[90px] text-right text-[14px] font-medium text-oh-ink">{money(it.qty * (r?.isKrupny ? it.krupny : it.opt))}</div>
                  <button type="button" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))} aria-label="Убрать" className="h-8 w-8 rounded-full text-oh-muted hover:bg-oh-paper hover:text-oh-primary">✕</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="oh-card p-5">
          <h2 className="mb-3 text-[18px] font-semibold text-oh-ink">2. Параметры вашего бизнеса</h2>
          <div className="grid grid-cols-1 gap-3 xsmall:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Регион доставки (оценка)</span>
              <select value={p.zone} onChange={(e) => setp("zone", e.target.value)} className={inp}>{ZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Канал продаж</span>
              <select value={p.chan} onChange={(e) => setp("chan", e.target.value)} className={inp}><option value="shop">Свой магазин / точка</option><option value="mp">Маркетплейс (WB, Ozon…)</option><option value="direct">Соцсети / напрямую</option></select></label>
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Наценка, %</span><input type="number" min={0} max={1000} value={p.markup} onChange={(e) => setp("markup", e.target.value)} className={inp} /></label>
            {p.chan !== "direct" && (
              <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">{p.chan === "mp" ? "Комиссия маркетплейса, %" : "Эквайринг и скидки, %"}</span><input type="number" min={0} max={60} value={p.fee} onChange={(e) => setp("fee", e.target.value)} className={inp} /></label>
            )}
            {p.chan === "mp" && (
              <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Логистика маркетплейса, ₽/шт</span><input type="number" min={0} value={p.mplog} onChange={(e) => setp("mplog", e.target.value)} className={inp} /></label>
            )}
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Упаковка и маркировка, ₽/шт</span><input type="number" min={0} value={p.pack} onChange={(e) => setp("pack", e.target.value)} className={inp} /></label>
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Налоговый режим</span>
              <select value={p.tax} onChange={(e) => setp("tax", e.target.value)} className={inp}><option value="0">Не учитывать</option><option value="6">УСН 6% (с выручки)</option><option value="15">УСН 15% (доходы − расходы)</option><option value="osno">ОСНО (НДС 22% + прибыль 25%)</option></select></label>
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">Прочие расходы, ₽/мес</span><input type="number" min={0} value={p.fix} onChange={(e) => setp("fix", e.target.value)} className={inp} /></label>
            <label className="flex flex-col gap-1"><span className="text-[13px] text-oh-graphite">План продаж, шт/мес</span><input type="number" min={1} value={p.plan} onChange={(e) => setp("plan", e.target.value)} className={inp} /></label>
          </div>
        </section>
      </div>
      <section className="oh-card p-5 small:sticky small:top-4">
        <h2 className="mb-2 text-[18px] font-semibold text-oh-ink">3. Ваша экономика</h2>
        {!r ? (
          <p className="text-[13px] text-oh-muted">Добавьте товары — расчёт появится здесь.</p>
        ) : (
          <div className="flex flex-col">
            <Line head l="Закупка" />
            <Line l={`${r.qtyTotal.toLocaleString("ru-RU")} шт · ${items.length} позиций`} v={money(r.purchase)} />
            {r.isKrupny ? <Line l="Крупный опт применён — экономия" v={money(r.saving)} good /> : <Line l={`До крупного опта не хватает ${money(KRUPNY_THRESHOLD - r.sumOpt)}`} v={`эконом. ${money(r.saving)}`} />}
            <Line l="Вес заказа" v={`${(Math.round(r.weight * 10) / 10).toLocaleString("ru-RU")} кг`} />
            <Line l="Доставка (оценка)" v={r.delivery ? money(r.delivery) : "бесплатно"} />
            <Line l="Упаковка" v={money(r.packCost)} />
            <Line l={<b>Вложения в партию</b>} v={money(r.invested)} />
            <Line head l="Продажа" />
            <table className="my-1 w-full text-[12.5px]">
              <thead><tr className="text-left text-oh-muted"><th className="py-1 font-normal">Товар</th><th className="py-1 font-normal">Себест./шт</th><th className="py-1 font-normal">Ваша цена</th></tr></thead>
              <tbody>{r.reco.map((x, i) => <tr key={i} className="border-t border-oh-line"><td className="max-w-[140px] truncate py-1 pr-2">{x.name}</td><td className="py-1 pr-2">{money2(x.unitCost)}</td><td className="py-1 font-semibold text-oh-ink">{money(x.recoPrice)}</td></tr>)}</tbody>
            </table>
            <Line l="Выручка с партии" v={money(r.revenue)} />
            {r.feeCost > 0 && <Line l={p.chan === "mp" ? "Комиссия маркетплейса" : "Эквайринг и скидки"} v={`− ${money(r.feeCost)}`} />}
            {r.mplogCost > 0 && <Line l="Логистика маркетплейса" v={`− ${money(r.mplogCost)}`} />}
            {r.fixTotal > 0 && <Line l={`Прочие расходы (${period(r.monthsToSell)} продаж)`} v={`− ${money(r.fixTotal)}`} />}
            {p.tax === "osno" && r.vat > 0 && <Line l="НДС 22% к уплате" v={`− ${money(r.vat)}`} />}
            {p.tax === "osno" && r.profitTax > 0 && <Line l="Налог на прибыль 25%" v={`− ${money(r.profitTax)}`} />}
            {p.tax !== "osno" && r.tax > 0 && <Line l={`Налог УСН ${p.tax}%`} v={`− ${money(r.tax)}`} />}
            <Line total l="Чистая прибыль с партии" v={money(r.profit)} good={r.profit >= 0} />
            <Line l="Прибыль с 1 шт" v={money2(r.profitUnit)} />
            <Line l="Маржинальность" v={`${r.marginPct.toFixed(1)}%`} />
            <Line l="Рентабельность вложений (ROI)" v={`${r.roiPct.toFixed(0)}%`} />
            <Line head l="Динамика" />
            <Line l="Точка безубыточности" v={r.beUnits ? `${r.beUnits.toLocaleString("ru-RU")} шт из ${r.qtyTotal.toLocaleString("ru-RU")}` : "—"} />
            <Line l="Партии хватит на" v={period(r.monthsToSell)} />
            <Line l={`Прибыль в месяц (план ${r.plan.toLocaleString("ru-RU")} шт)`} v={money(r.monthlyProfit)} good={r.monthlyProfit >= 0} />
          </div>
        )}
        <button type="button" onClick={addAll} disabled={!r || adding} className="oh-btn mt-4 w-full disabled:!bg-oh-line-2 disabled:!text-oh-graphite">
          {adding ? "Добавляем…" : "Добавить подбор в корзину"}
        </button>
        <p className="mt-2 text-[12px] leading-relaxed text-oh-muted">
          Количество распределим по размерам в наличии поровну — поправите в корзине. Доставка и прибыль — оценочные; цены закупки — реальные оптовые цены сайта, от {money(KRUPNY_THRESHOLD)} автоматически действует крупный опт.
        </p>
      </section>
    </div>
  )
}

export default BizCalc
