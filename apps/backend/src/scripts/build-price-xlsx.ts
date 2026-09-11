/**
 * Прайс-лист Excel с фото (как «Скачать прайс» на старом сайте): все товары с фото, цены опт / крупный опт / РРЦ,
 * размеры в наличии, упаковка/комплект, остаток, ссылка на карточку. Миниатюры 64 px через sharp.
 * Результат: /srv/ohana/shared/uploads/price/ohana-price.xlsx (отдаётся Caddy как /uploads/price/…).
 *   npx medusa exec ./src/scripts/build-price-xlsx.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ExcelJS from "exceljs"
import fs from "fs"
import path from "path"
import sharp from "sharp"

const OUT_DIR = "/srv/ohana/shared/uploads/price"
const IMG_DIR = "/srv/ohana/shared/images"
const SITE = process.env.STOREFRONT_URL || "https://ohanaopt.ru"

export default async function buildPriceXlsx({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const { rows } = await pg.raw(`
    select p.id, p.handle, p.title, p.thumbnail, p.metadata as pmeta, v.metadata as vmeta, v.sku,
           (select min(pr.amount) from product_variant_price_set ps join price pr on pr.price_set_id = ps.price_set_id and pr.price_list_id is null and pr.currency_code = 'rub' and pr.deleted_at is null where ps.variant_id = v.id and ps.deleted_at is null)::float as opt,
           coalesce((select sum(il.stocked_quantity - il.reserved_quantity) from product_variant_inventory_item vi join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null where vi.variant_id = v.id and vi.deleted_at is null), 0)::float as stock,
           (select string_agg(c.name, ' / ' order by c.rank) from product_category_product pcp join product_category c on c.id = pcp.product_category_id where pcp.product_id = p.id and c.metadata->>'kind' is distinct from 'showcase') as category
    from product p join product_variant v on v.product_id = p.id and v.deleted_at is null
    where p.deleted_at is null and p.status = 'published' and p.thumbnail is not null
    order by p.title, v.variant_rank`)

  type Prod = { id: string; handle: string; title: string; thumbnail: string; code: string; category: string; sizeRange: string; lineika: boolean; pack: boolean; setQty: number; opt: number; krupny: number; rrc: number; stock: number; sizesIn: string[] }
  const byId = new Map<string, Prod>()
  for (const r of rows) {
    const pm = r.pmeta || {}, vm = r.vmeta || {}
    let p = byId.get(r.id)
    if (!p) { p = { id: r.id, handle: r.handle, title: r.title, thumbnail: r.thumbnail, code: String(pm.code || ""), category: r.category || "", sizeRange: String(pm.size_range || ""), lineika: !!pm.lineika, pack: !!pm.pack, setQty: Number(pm.set_qty) || Number(vm.pack_qty) || 0, opt: Infinity, krupny: Infinity, rrc: 0, stock: 0, sizesIn: [] }; byId.set(r.id, p) }
    if (r.opt && r.opt < p.opt) p.opt = r.opt
    const kr = Number(vm.price_krupny) || 0; if (kr && kr < p.krupny) p.krupny = kr
    const rrc = Number(vm.rrc) || 0; if (rrc > p.rrc) p.rrc = rrc
    p.stock += Math.max(0, r.stock || 0)
    if ((r.stock || 0) > 0 && vm.size) p.sizesIn.push(String(vm.size).split(" ")[0])
  }
  const products = [...byId.values()].filter((p) => isFinite(p.opt)).sort((a, b) => a.category.localeCompare(b.category, "ru") || a.title.localeCompare(b.title, "ru"))

  const wb = new ExcelJS.Workbook()
  wb.creator = "Ohana Market"
  const ws = wb.addWorksheet("Прайс-лист", { views: [{ state: "frozen", ySplit: 4 }] })
  ws.columns = [
    { header: "Фото", key: "img", width: 11 }, { header: "Артикул", key: "code", width: 14 }, { header: "Наименование", key: "title", width: 48 },
    { header: "Раздел", key: "category", width: 26 }, { header: "Размеры в наличии", key: "sizes", width: 22 }, { header: "Продажа", key: "unit", width: 18 },
    { header: "Опт, ₽/шт", key: "opt", width: 11 }, { header: "Крупный опт, ₽/шт", key: "krupny", width: 15 }, { header: "РРЦ, ₽", key: "rrc", width: 10 },
    { header: "Остаток, шт", key: "stock", width: 11 }, { header: "Ссылка", key: "url", width: 40 },
  ]
  ws.spliceRows(1, 0, [], [], [])
  ws.getCell("A1").value = "Ohana Market — оптовый прайс-лист"; ws.getCell("A1").font = { bold: true, size: 14 }
  ws.getCell("A2").value = `Дата: ${new Date().toLocaleDateString("ru-RU")} · Опт от 35 000 ₽, крупный опт от 100 000 ₽ (применяется в корзине автоматически) · 8 (991) 430-17-30 · ${SITE}`
  ws.getRow(4).font = { bold: true }; ws.getRow(4).alignment = { vertical: "middle", wrapText: true }
  ws.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F1EE" } }

  let rowN = 5, withImg = 0
  for (const p of products) {
    const unit = p.lineika ? `комплект ${p.setQty} шт (${p.sizeRange})` : p.pack ? `упаковка ${p.setQty} шт` : p.setQty > 1 ? `кратно ${p.setQty} шт` : "поштучно"
    ws.addRow({ code: p.code, title: p.title, category: p.category, sizes: [...new Set(p.sizesIn)].join(", "), unit, opt: p.opt, krupny: isFinite(p.krupny) ? p.krupny : "", rrc: p.rrc || "", stock: p.stock, url: `${SITE}/ru/products/${p.handle}` })
    const row = ws.getRow(rowN); row.height = 52; row.alignment = { vertical: "middle", wrapText: true }
    row.getCell("url").value = { text: "открыть", hyperlink: `${SITE}/ru/products/${p.handle}` } as any; row.getCell("url").font = { color: { argb: "FF246075" }, underline: true }
    const m = p.thumbnail.match(/\/images\/(.+)$/)
    if (m) {
      const f = path.join(IMG_DIR, decodeURIComponent(m[1]))
      try {
        const buf = await sharp(f).resize(64, 68, { fit: "inside", background: "#fff" }).jpeg({ quality: 70 }).toBuffer()
        const imgId = wb.addImage({ buffer: buf as any, extension: "jpeg" })
        ws.addImage(imgId, { tl: { col: 0.1, row: rowN - 1 + 0.08 } as any, ext: { width: 60, height: 64 } })
        withImg++
      } catch {}
    }
    rowN++
  }
  ws.getColumn("opt").numFmt = "#,##0"; ws.getColumn("krupny").numFmt = "#,##0"; ws.getColumn("rrc").numFmt = "#,##0"
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tmp = path.join(OUT_DIR, "ohana-price.tmp.xlsx"), out = path.join(OUT_DIR, "ohana-price.xlsx")
  await wb.xlsx.writeFile(tmp); fs.renameSync(tmp, out)
  logger.info(`прайс: ${products.length} товаров, с фото ${withImg}, ${(fs.statSync(out).size / 1048576).toFixed(1)} МБ → ${out}`)
}
