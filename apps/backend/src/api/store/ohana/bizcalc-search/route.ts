import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/ohana/bizcalc-search?q= — поиск товара для калькуляторов («Бизнес с Оханой», «Совместные покупки»):
 * до 10 товаров в наличии с оптовой ценой, ценой крупного опта, РРЦ, весом, кратностью и размерами с остатком.
 * Один SQL, как в /store/ohana/catalog.
 */
type Row = {
  id: string; handle: string; title: string; code: string | null; thumbnail: string | null; pweight: number | null; pmeta: any; vmeta: any
  vid: string; size: string | null; vweight: number | null; price: number | null; krupny: string | null; rrc: string | null; step: string | null; stock: number | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const q = String((req.query as any).q || "").trim()
  if (q.length < 2) return res.json([])
  const sql = `
    select p.id, p.handle, p.title, p.metadata->>'code' as code, p.thumbnail, p.weight::float as pweight, p.metadata as pmeta, v.metadata as vmeta,
           v.id as vid, v.metadata->>'size' as size, v.weight::float as vweight,
           min(pr.amount)::float as price, v.metadata->>'price_krupny' as krupny, v.metadata->>'rrc' as rrc, v.metadata->>'qty_step' as step,
           coalesce(sum(il.stocked_quantity - il.reserved_quantity), 0)::float as stock
    from product p
    join product_variant v on v.product_id = p.id and v.deleted_at is null
    left join product_variant_price_set ps on ps.variant_id = v.id and ps.deleted_at is null
    left join price pr on pr.price_set_id = ps.price_set_id and pr.price_list_id is null and pr.currency_code = 'rub' and pr.deleted_at is null
    left join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null
    left join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null
    where p.deleted_at is null and p.status = 'published' and (p.title ilike ? or p.metadata->>'code' ilike ?)
    group by p.id, v.id`
  const { rows } = (await pg.raw(sql, [`%${q}%`, `${q}%`])) as { rows: Row[] }
  const byId = new Map<string, any>()
  for (const r of rows) {
    let p = byId.get(r.id)
    if (!p) { p = { id: r.id, handle: r.handle, name: r.title, code: r.code || "", img: r.thumbnail, opt: Infinity, krupny: Infinity, rrc: 0, weight: (r.pweight || 0) / 1000, step: 1, stock: 0, lineika: !!r.pmeta?.lineika, pack: !!r.pmeta?.pack, per: Number(r.pmeta?.set_qty) || Number(r.vmeta?.pack_qty) || 0, variants: [] as any[] }; byId.set(r.id, p) }
    const stock = r.stock || 0, step = Math.max(1, Number(r.step) || 1)
    if (r.price && r.price < p.opt) p.opt = r.price
    const k = Number(r.krupny) || r.price || 0; if (k && k < p.krupny) p.krupny = k
    if (Number(r.rrc) > p.rrc) p.rrc = Number(r.rrc)
    if (!p.weight && r.vweight) { const per = Number(r.vmeta?.pack_qty) || 1; p.weight = (r.vweight >= 1000 && per > 1 && r.vmeta?.pack_unit !== "Y" ? r.vweight / per : r.vweight) / 1000 } // вес комплекта из 1С → за штуку
    p.step = step; p.stock += stock
    if (stock > 0) p.variants.push({ id: r.vid, size: r.size || "", stock, step })
  }
  const out = [...byId.values()].filter((p) => p.stock > 0 && isFinite(p.opt) && p.img)
    .sort((a, b) => b.stock - a.stock).slice(0, 10)
    .map((p) => ({ ...p, opt: Math.round(p.opt * 100) / 100, krupny: isFinite(p.krupny) ? Math.round(p.krupny * 100) / 100 : p.opt, weight: Math.round(p.weight * 1000) / 1000 }))
  res.setHeader("Cache-Control", "no-store")
  res.json(out)
}
