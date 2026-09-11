import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_DOC_FIELDS } from "../../../../../../lib/order-graph"
import { packingItems } from "../../../../../../lib/packing"

/** GET /admin/ohana/orders/:id/items — состав заказа для сборки (виджет в карточке заказа) */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_DOC_FIELDS, filters: { id: req.params.id } })
  if (!data[0]) return res.status(404).json({ message: "not found" })
  res.json(packingItems(data[0]))
}
