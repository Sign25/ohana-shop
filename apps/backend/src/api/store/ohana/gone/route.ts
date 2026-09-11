import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/ohana/gone?handle= — куда вести с адреса скрытого товара (draft, без фото): главная категория
 * каталога → ближайший активный родитель → корень (как OHANA-GONE-REDIRECT на старом сайте). 302, не 301:
 * блокировка из 1С обратима.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const handle = String((req.query as any).handle || "")
  if (!handle) return res.json({ redirect: null })
  const { rows } = await pg.raw(`select p.id, p.status, p.thumbnail from product p where p.handle = ? and p.deleted_at is null`, [handle])
  const p = rows[0]
  if (!p) return res.json({ redirect: null, exists: false })
  const { rows: cats } = await pg.raw(`select c.id, c.handle, c.is_active, c.parent_category_id, c.metadata->>'kind' as kind
    from product_category_product pcp join product_category c on c.id = pcp.product_category_id and c.deleted_at is null
    where pcp.product_id = ? order by (c.metadata->>'kind' = 'catalog') desc, c.rank`, [p.id])
  let cat = cats[0]
  for (let i = 0; cat && !cat.is_active && i < 10; i++) {
    const { rows: parent } = await pg.raw(`select id, handle, is_active, parent_category_id from product_category where id = ? and deleted_at is null`, [cat.parent_category_id])
    cat = parent[0]
  }
  res.json({ exists: true, hidden: p.status !== "published" || !p.thumbnail, redirect: cat && cat.is_active ? `/categories/${cat.handle}` : "/store" })
}
