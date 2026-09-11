import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const pages = await svc.listPages({ status: "published" }, { select: ["id", "slug", "title", "sort"], order: { sort: "ASC" } })
  res.json({ pages })
}
