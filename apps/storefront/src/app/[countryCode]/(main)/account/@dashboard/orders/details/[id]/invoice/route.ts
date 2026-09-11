import { getAuthHeaders } from "@/lib/data/cookies"
import { NextRequest, NextResponse } from "next/server"

/** Счёт покупателю: проксируем /store/ohana/orders/:id/invoice с авторизацией кабинета (JWT лежит в cookie витрины) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const headers: Record<string, string> = { ...(await getAuthHeaders()) } as any
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) headers["x-publishable-api-key"] = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const r = await fetch(`${process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/ohana/orders/${encodeURIComponent(id)}/invoice`, { headers, cache: "no-store" })
  const html = await r.text()
  return new NextResponse(html, { status: r.status, headers: { "content-type": "text/html; charset=utf-8" } })
}
