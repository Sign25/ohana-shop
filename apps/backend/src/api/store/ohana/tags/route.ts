import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TAG_HIDDEN, TAG_NAMES } from "../../../../lib/tags"

/** GET /store/ohana/tags — хэштеги витрины: теги 1С, у которых есть товары в наличии с фото; порядок как в 1С */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const { rows } = await pg.raw(`
    select t.tag, count(distinct p.id)::int as n from product p
    cross join lateral jsonb_array_elements_text(coalesce(p.metadata->'tags', '[]'::jsonb)) as t(tag)
    where p.deleted_at is null and p.status = 'published' and p.thumbnail is not null
      and exists (select 1 from product_variant v join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null
                  join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null
                  where v.product_id = p.id and v.deleted_at is null and il.stocked_quantity - il.reserved_quantity > 0)
    group by t.tag`)
  const count = new Map<string, number>(rows.map((r: any) => [r.tag, r.n]))
  const tags = TAG_NAMES.filter((t) => !TAG_HIDDEN.has(t) && (count.get(t) || 0) > 0).map((t) => ({ tag: t, count: count.get(t) || 0 }))
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ tags })
}
