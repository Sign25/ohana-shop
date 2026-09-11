"use client"

import { getDemandCount, submitDemand } from "@/lib/data/product-extras"
import { plural } from "@/lib/util/ohana"
import { useEffect, useState } from "react"

/** Распроданный товар: «Мне это нужно» — заявка копится для закупки, покупателю сообщим о поступлении */
const ProductDemand = ({ productId }: { productId: string }) => {
  const [email, setEmail] = useState("")
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { getDemandCount(productId).then(setCount) }, [productId])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await submitDemand(productId, email)
    setBusy(false)
    setMsg({ ok: r.ok, text: r.message })
    if (r.ok && typeof r.count === "number") setCount(r.count)
  }

  return (
    <div className="oh-card flex flex-col gap-3 bg-oh-paper p-4">
      <div>
        <div className="text-[16px] font-semibold text-oh-ink">Всё разобрали</div>
        <p className="text-[13.5px] text-oh-graphite">Эта модель закончилась. Нажмите «Мне это нужно» — мы учтём спрос при следующей закупке и напишем, когда товар вернётся.</p>
      </div>
      {msg?.ok ? (
        <div className="rounded-xl border border-oh-mint-deep/40 bg-white px-4 py-3 text-[14px] text-oh-ink">{msg.text}</div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2 xsmall:flex-row">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ваша электронная почта" className="h-11 flex-1 rounded-pill border border-oh-line-2 bg-white px-4 text-[14px] outline-none focus:border-oh-azure" />
          <button type="submit" disabled={busy} className="oh-btn h-11 whitespace-nowrap px-6">{busy ? "Записываем…" : "Мне это нужно"}</button>
        </form>
      )}
      {msg && !msg.ok && <div className="text-[13px] text-oh-primary">{msg.text}</div>}
      {count > 0 && <div className="text-[12.5px] text-oh-muted">Уже {plural(count, "ждёт", "ждут", "ждут")} {count} {plural(count, "покупатель", "покупателя", "покупателей")}</div>}
    </div>
  )
}

export default ProductDemand
