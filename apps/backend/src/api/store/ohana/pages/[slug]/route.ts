import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../../modules/content"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const [page] = await svc.listPages({ slug: req.params.slug, status: "published" })
  if (!page) return res.status(404).json({ message: "not found" })
  res.json({ page })
}
