import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError, Modules, QueryContext } from "@medusajs/framework/utils"
import { KRUPNY_THRESHOLD } from "../../../../../lib/ohana"

/**
 * POST /store/carts/:id/ohana-tier — уровень цен оптовика по сумме корзины.
 *
 * Правило с текущего ohanaopt.ru: при сумме корзины (по базовым оптовым ценам) от 100 000 ₽
 * все позиции автоматически переходят на цену «крупного опта» (variant.metadata.price_krupny),
 * ниже порога — возвращаются к базовой. Цена фиксируется в line item как custom price,
 * базовая цена запоминается в item.metadata.base_price, чтобы порог считался по ней, а не по уже сниженной.
 * Витрина вызывает этот маршрут после каждого изменения корзины.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const cartModule = req.scope.resolve(Modules.CART)

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: ["id", "region_id", "currency_code", "items.id", "items.quantity", "items.unit_price", "items.variant_id", "items.metadata", "items.is_custom_price"],
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  const items = (cart.items || []).filter((i: any) => i.variant_id)
  if (!items.length) {
    return res.json({ tier: "opt", base_subtotal: 0, threshold: KRUPNY_THRESHOLD, changed: 0 })
  }

  // базовые цены вариантов в регионе корзины + цена крупного опта из metadata
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "metadata", "calculated_price.*"],
    filters: { id: items.map((i: any) => i.variant_id) },
    context: { calculated_price: QueryContext({ region_id: cart.region_id, currency_code: cart.currency_code }) },
  })
  const byId = new Map<string, any>(variants.map((v: any) => [v.id, v]))

  let baseSubtotal = 0
  const rows = items.map((i: any) => {
    const v = byId.get(i.variant_id)
    const base = Number(i.metadata?.base_price) || Number(v?.calculated_price?.calculated_amount) || Number(i.unit_price)
    const krupny = Number(v?.metadata?.price_krupny) || 0
    baseSubtotal += base * i.quantity
    return { item: i, base, krupny }
  })

  const tier: "opt" | "krupny" = baseSubtotal >= KRUPNY_THRESHOLD ? "krupny" : "opt"
  const updates: any[] = []
  for (const { item, base, krupny } of rows) {
    const target = tier === "krupny" && krupny > 0 && krupny < base ? krupny : base
    const custom = target !== base
    if (Number(item.unit_price) !== target || !!item.is_custom_price !== custom || item.metadata?.tier !== tier) {
      updates.push({
        selector: { id: item.id },
        data: {
          unit_price: target,
          is_custom_price: custom,
          metadata: { ...(item.metadata || {}), base_price: base, price_krupny: krupny || null, tier },
        },
      })
    }
  }
  if (updates.length) {
    try {
      await cartModule.updateLineItems(updates)
    } catch (e: any) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Не удалось пересчитать уровень цен: ${e.message}`)
    }
  }

  res.json({ tier, base_subtotal: baseSubtotal, threshold: KRUPNY_THRESHOLD, changed: updates.length })
}
