import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/ohana/wb?codes=a,b,c — рейтинги Wildberries по артикулам (для плиток и «Хит»);
 * GET /store/ohana/wb?code=X&offset=0&limit=10 — рейтинг + тексты отзывов для карточки товара.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const qp = req.query as Record<string, any>
  res.setHeader("Cache-Control", "public, max-age=300")
  if (qp.codes) {
    const codes = String(qp.codes).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200)
    if (!codes.length) return res.json({ ratings: {} })
    const { rows } = await pg.raw(`select product_code, rating, reviews_count, text_count from ohana_wb_rating where product_code = any(?)`, [codes])
    return res.json({ ratings: Object.fromEntries(rows.map((r: any) => [r.product_code, { rating: Number(r.rating), count: Number(r.reviews_count), texts: Number(r.text_count) }])) })
  }
  const code = String(qp.code || "").trim()
  if (!code) return res.json({ rating: null, reviews: [] })
  const limit = Math.min(Math.max(Number(qp.limit) || 10, 1), 50), offset = Math.max(Number(qp.offset) || 0, 0)
  const { rows: rt } = await pg.raw(`select rating, reviews_count, text_count, nm_id, synced_at from ohana_wb_rating where product_code = ?`, [code])
  const { rows: rv } = await pg.raw(`select valuation, author, body, created_date from ohana_wb_review where product_code = ? order by created_date desc limit ? offset ?`, [code, limit, offset])
  const { rows: dist } = await pg.raw(`select valuation, count(*)::int as n from ohana_wb_review where product_code = ? group by valuation`, [code])
  res.json({
    rating: rt[0] ? { rating: Number(rt[0].rating), count: Number(rt[0].reviews_count), texts: Number(rt[0].text_count), nm_id: String(rt[0].nm_id), synced_at: rt[0].synced_at } : null,
    reviews: rv.map((r: any) => ({ valuation: Number(r.valuation), author: r.author, body: r.body, date: r.created_date })),
    distribution: Object.fromEntries(dist.map((d: any) => [d.valuation, d.n])),
  })
}
