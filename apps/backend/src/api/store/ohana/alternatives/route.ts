import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** GET /store/ohana/alternatives?product_id= — другие расцветки / похожие модели из 1С (metadata.alt_group) */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const id = String((req.query as any).product_id || "")
  if (!id) return res.json({ products: [] })
  const { rows } = await pg.raw(`
    select p.id, p.handle, p.title, p.thumbnail, p.metadata->>'color_label' as color, p.metadata->>'code' as code,
           coalesce((select sum(il.stocked_quantity - il.reserved_quantity) from product_variant v
              join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null
              join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null
              where v.product_id = p.id and v.deleted_at is null), 0)::float as stock
    from product p
    where p.deleted_at is null and p.status = 'published' and p.thumbnail is not null and p.id <> ?
      and p.metadata->>'alt_group' = (select metadata->>'alt_group' from product where id = ?)
    order by (coalesce((select sum(il.stocked_quantity - il.reserved_quantity) from product_variant v
              join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null
              join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null
              where v.product_id = p.id and v.deleted_at is null), 0) > 0) desc, p.metadata->>'code', p.title`, [id, id])
  res.setHeader("Cache-Control", "public, max-age=120")
  res.json({ products: rows.map((r: any) => ({ id: r.id, handle: r.handle, title: r.title, thumbnail: r.thumbnail, color: r.color, code: r.code, in_stock: r.stock > 0 })) })
}
