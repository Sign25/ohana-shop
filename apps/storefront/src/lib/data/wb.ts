import { sdk } from "@/lib/config"

/** Рейтинг и отзывы Wildberries по артикулу (маршрут /store/ohana/wb) */
export type WbRating = { rating: number; count: number; texts: number }
export type WbReview = { valuation: number; author: string; body: string; date: string }
export const HIT_MIN_REVIEWS = 1000 // «Хит продаж» — от 1000 отзывов на Wildberries

export const getWbRatings = async (codes: string[]): Promise<Record<string, WbRating>> => {
  const list = [...new Set(codes.filter(Boolean))]
  if (!list.length) return {}
  try {
    const { ratings } = await sdk.client.fetch<{ ratings: Record<string, WbRating> }>(`/store/ohana/wb`, { method: "GET", query: { codes: list.join(",") }, next: { revalidate: 300 } })
    return ratings
  } catch { return {} }
}

export const getWbProduct = async (code: string, offset = 0, limit = 10): Promise<{ rating: (WbRating & { nm_id: string; synced_at: string | null }) | null; reviews: WbReview[]; distribution: Record<string, number> }> => {
  try {
    return await sdk.client.fetch(`/store/ohana/wb`, { method: "GET", query: { code, offset, limit }, next: { revalidate: 300 } })
  } catch { return { rating: null, reviews: [], distribution: {} } }
}
