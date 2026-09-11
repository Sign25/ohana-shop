import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CONTENT_MODULE } from "../../../../modules/content"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const banners = await svc.listBanners({}, { order: { place: "ASC", sort: "ASC" } })
  res.json({ banners })
}
export const POST = async (req: AuthenticatedMedusaRequest<any>, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const b = req.body || {}
  if (!String(b.image_url || "").trim()) return res.status(400).json({ message: "Загрузите картинку" })
  const [banner] = await svc.createBanners([{ place: b.place || "hero", title: b.title || "Баннер", image_url: b.image_url, mobile_image_url: b.mobile_image_url || null, link: b.link || null, alt: b.alt || null, sort: Number(b.sort) || 0, active: b.active !== false, starts_at: b.starts_at || null, ends_at: b.ends_at || null }])
  res.json({ banner })
}
