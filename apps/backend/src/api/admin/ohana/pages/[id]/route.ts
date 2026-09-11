import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CONTENT_MODULE } from "../../../../../modules/content"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  res.json({ page: await svc.retrievePage(req.params.id) })
}
export const POST = async (req: AuthenticatedMedusaRequest<any>, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const b = req.body || {}
  const upd: any = { id: req.params.id }
  for (const k of ["title", "page_title", "meta", "html", "slug"]) if (k in b) upd[k] = b[k]
  if ("has_h1" in b) upd.has_h1 = !!b.has_h1
  if ("status" in b) upd.status = b.status === "draft" ? "draft" : "published"
  if ("sort" in b) upd.sort = Number(b.sort) || 0
  const [page] = await svc.updatePages([upd])
  res.json({ page })
}
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  await svc.deletePages([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}
