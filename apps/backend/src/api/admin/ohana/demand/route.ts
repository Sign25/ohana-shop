import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CONTENT_MODULE } from "../../../../modules/content"

/** GET /admin/ohana/demand?product_id= — заявки «Мне это нужно» по товару (или все, если без product_id) */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const pid = String((req.query as any).product_id || "")
  const demands = await svc.listDemands(pid ? { product_id: pid } : {}, { order: { created_at: "DESC" }, take: 500 })
  res.json({ demands })
}
