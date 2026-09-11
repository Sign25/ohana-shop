import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"

/** Активные баннеры места (по умолчанию hero) с учётом сроков показа */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const place = String((req.query as any).place || "hero")
  const now = Date.now()
  const all = await svc.listBanners({ place, active: true }, { order: { sort: "ASC" } })
  const banners = all.filter((b: any) => (!b.starts_at || new Date(b.starts_at).getTime() <= now) && (!b.ends_at || new Date(b.ends_at).getTime() >= now))
  res.json({ banners })
}
