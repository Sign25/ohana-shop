import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { OPT_THRESHOLD } from "../../lib/ohana"

/**
 * Минимальный оптовый заказ 35 000 ₽ (правило текущего сайта): корзину дешевле
 * нельзя превратить в заказ. Проверяется на POST /store/carts/:id/complete,
 * витрина показывает то же ограничение заранее.
 */
export async function ohanaMinOrder(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [cart],
  } = await query.graph({ entity: "cart", fields: ["id", "item_subtotal", "metadata"], filters: { id: req.params.id } })
  if (cart && Number(cart.item_subtotal) < OPT_THRESHOLD && !cart.metadata?.ohana_skip_min_order) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Минимальная сумма оптового заказа — ${OPT_THRESHOLD.toLocaleString("ru-RU")} ₽. Сейчас в корзине ${Math.round(Number(cart.item_subtotal)).toLocaleString("ru-RU")} ₽.`
    )
  }
  next()
}
