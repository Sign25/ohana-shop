import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
export default async function probe({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const t0 = Date.now()
  const { data, metadata } = await query.graph({
    entity: "product",
    fields: ["id", "title", "created_at", "categories.id", "variants.id", "variants.metadata", "variants.price_set.prices.amount", "variants.price_set.prices.price_list_id", "variants.price_set.prices.currency_code",
      "variants.inventory_items.inventory.location_levels.stocked_quantity", "variants.inventory_items.inventory.location_levels.reserved_quantity"],
    filters: { status: "published", q: "халат" } as any,
    pagination: { skip: 0, take: 3 },
  })
  console.log("ms", Date.now() - t0, "count", metadata?.count)
  console.log(JSON.stringify(data[0], null, 1).slice(0, 2500))
  const t1 = Date.now()
  const all = await query.graph({ entity: "product", fields: ["id", "created_at", "categories.id", "variants.metadata", "variants.price_set.prices.amount", "variants.price_set.prices.price_list_id", "variants.inventory_items.inventory.location_levels.stocked_quantity", "variants.inventory_items.inventory.location_levels.reserved_quantity"], filters: { status: "published" } as any })
  console.log("all ms", Date.now() - t1, "n", all.data.length)
}
