"use client"

import { requestCallback } from "@/lib/data/product-extras"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"
import { useState } from "react"

/** «Заказать звонок» в топ-панели: короткая форма → лид в Битрикс24 (как на старом сайте) */
const CallbackButton = () => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [f, setF] = useState({ name: "", phone: "", comment: "" })
  const pathname = usePathname()

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    const r = await requestCallback({ ...f, page: typeof window !== "undefined" ? window.location.href : pathname })
    setBusy(false); setMsg({ ok: r.ok, text: r.message })
    if (r.ok) setF({ name: "", phone: "", comment: "" })
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(null) }} className="rounded-pill border border-oh-line bg-white px-3 py-1 font-medium text-oh-graphite hover:border-oh-azure hover:text-oh-azure">
        Заказать звонок
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-oh-ink/40 p-4" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Заказать звонок">
          <div className="w-full max-w-[420px] rounded-card bg-white p-6 text-[14px] text-oh-ink shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-[20px] font-semibold">Заказать звонок</div>
            <p className="mb-4 text-[13px] text-oh-graphite">Менеджер перезвонит в рабочее время: пн–пт 10:00–18:00 (Омск). Или звоните сами: <a href="tel:+79914301730" className="font-semibold text-oh-ink hover:text-oh-azure">8 (991) 430-17-30</a>.</p>
            {msg?.ok ? (
              <div className="rounded-xl border border-oh-mint-deep/40 bg-oh-paper px-4 py-3">{msg.text}</div>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-2">
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Как к вам обращаться" className="h-11 rounded-pill border border-oh-line-2 px-4 outline-none focus:border-oh-azure" />
                <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Телефон" type="tel" required autoFocus className="h-11 rounded-pill border border-oh-line-2 px-4 outline-none focus:border-oh-azure" />
                <textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Что интересует (необязательно)" rows={2} className="rounded-xl border border-oh-line-2 px-4 py-2 outline-none focus:border-oh-azure" />
                {msg && !msg.ok && <div className="text-[13px] text-oh-primary">{msg.text}</div>}
                <button type="submit" disabled={busy} className="oh-btn h-11">{busy ? "Отправляем…" : "Перезвоните мне"}</button>
                <p className="text-[11.5px] text-oh-muted">Нажимая кнопку, вы соглашаетесь с <LocalizedClientLink href="/p/privacy-policy" className="underline">политикой конфиденциальности</LocalizedClientLink>.</p>
              </form>
            )}
            <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full text-center text-[13px] text-oh-muted hover:text-oh-ink">Закрыть</button>
          </div>
        </div>
      )}
    </>
  )
}

export default CallbackButton
