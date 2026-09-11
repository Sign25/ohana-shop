import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_DOC_FIELDS } from "../../../../../../lib/order-graph"
import { packingSlipHtml } from "../../../../../../lib/packing"

/** GET /admin/ohana/orders/:id/packing-slip — лист подбора (печатная форма) */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_DOC_FIELDS, filters: { id: req.params.id } })
  if (!data[0]) return res.status(404).send("Заказ не найден")
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.send(packingSlipHtml(data[0]))
}
