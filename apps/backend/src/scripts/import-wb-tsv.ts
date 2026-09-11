/**
 * Разовый перенос рейтингов и отзывов Wildberries со старого сайта (TSV из MySQL) в таблицы модуля content.
 *   npx medusa exec ./src/scripts/import-wb-tsv.ts   (файлы /srv/ohana/shared/wb/rating.tsv, reviews.tsv)
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"

export default async function importWbTsv({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const now = new Date().toISOString()
  const ratings = fs.readFileSync("/srv/ohana/shared/wb/rating.tsv", "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"))
  let r = 0
  for (const [code, nm, rating, cnt, txt, upd] of ratings) {
    await pg.raw(`insert into ohana_wb_rating (id, product_code, nm_id, rating, reviews_count, text_count, synced_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, to_timestamp(?), now(), now())
      on conflict (product_code) where deleted_at is null do update set nm_id = excluded.nm_id, rating = excluded.rating, reviews_count = excluded.reviews_count, text_count = excluded.text_count, synced_at = excluded.synced_at, updated_at = now()`,
      [`wbr_${code.replace(/[^A-Za-z0-9]/g, "")}_${nm}`, code, Number(nm) || 0, Number(rating) || 0, Number(cnt) || 0, Number(txt) || 0, Number(upd) || Math.floor(Date.now() / 1000)])
    r++
  }
  const lines = fs.readFileSync("/srv/ohana/shared/wb/reviews.tsv", "utf8").split("\n").filter(Boolean)
  let n = 0, bad = 0
  const batch: any[][] = []
  const flush = async () => {
    if (!batch.length) return
    const values = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, now(), now())").join(",")
    await pg.raw(`insert into ohana_wb_review (id, feedback_id, product_code, nm_id, valuation, author, body, created_date, created_at, updated_at) values ${values} on conflict (feedback_id) where deleted_at is null do nothing`, batch.flat())
    batch.length = 0
  }
  for (const l of lines) {
    const f = l.split("\t")
    if (f.length !== 7) { bad++; continue }
    const [fid, code, nm, val, author, body, cdate] = f
    batch.push([`wbf_${fid.replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`, fid, code, Number(nm) || 0, Number(val) || 0, author.slice(0, 128), body.replace(/\\n/g, "\n").slice(0, 4000), cdate])
    n++
    if (batch.length >= 500) await flush()
  }
  await flush()
  logger.info(`WB: рейтингов ${r}, отзывов ${n} (пропущено строк ${bad}) — перенесено ${now}`)
}
