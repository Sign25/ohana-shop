import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CONTENT_MODULE } from "../../../../../modules/content"

export const POST = async (req: AuthenticatedMedusaRequest<any>, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const b = req.body || {}
  const upd: any = { id: req.params.id }
  for (const k of ["place", "title", "image_url", "mobile_image_url", "link", "alt", "starts_at", "ends_at"]) if (k in b) upd[k] = b[k] || null
  if ("sort" in b) upd.sort = Number(b.sort) || 0
  if ("active" in b) upd.active = !!b.active
  if (upd.image_url === null) delete upd.image_url
  if (upd.title === null) upd.title = "Баннер"
  const [banner] = await svc.updateBanners([upd])
  res.json({ banner })
}
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  await svc.deleteBanners([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}
