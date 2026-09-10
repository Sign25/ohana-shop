"use client"

import { clx } from "@medusajs/ui"

/** Карточка шага оформления: номер, заголовок, «Изменить» у заполненного шага, приглушённый вид у ещё недоступного */
const StepCard = ({
  n, title, open, done, locked, onEdit, children, summary, testId,
}: {
  n: number
  title: string
  open: boolean
  done: boolean
  locked?: boolean
  onEdit?: () => void
  children?: React.ReactNode
  summary?: React.ReactNode
  testId?: string
}) => (
  <section className={clx("oh-card p-5", locked && !open && "opacity-60")} data-testid={testId}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[18px] font-semibold text-oh-ink">
        <span
          className={clx(
            "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold",
            open ? "bg-oh-azure text-white" : done ? "bg-oh-mint-deep text-white" : "border border-oh-line-2 text-oh-muted"
          )}
        >
          {done && !open ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5L20 7" /></svg>
          ) : (
            n
          )}
        </span>
        {title}
      </h2>
      {!open && done && onEdit && (
        <button type="button" onClick={onEdit} className="text-[13px] text-oh-azure hover:underline">
          Изменить
        </button>
      )}
    </div>
    {open ? <div className="mt-4">{children}</div> : done && summary ? <div className="mt-3 text-[14px] text-oh-graphite">{summary}</div> : null}
  </section>
)

export default StepCard
