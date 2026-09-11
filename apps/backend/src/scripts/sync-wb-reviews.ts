/**
 * Отзывы и рейтинг Wildberries → таблицы ohana_wb_rating / ohana_wb_review (перенос wb_reviews_sync.php со старого сайта).
 * 1) по последним отзывам собираем карту артикул (supplierArticle) → nmId; 2) по каждому nmId — все отзывы:
 * точное число, средняя оценка, тексты. Токен: /etc/ohana/wb.conf (WB_TOKEN=…), API «Вопросы и отзывы» — только чтение.
 *   npx medusa exec ./src/scripts/sync-wb-reviews.ts [quiet]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"

const API = "https://feedbacks-api.wildberries.ru/api/v1/feedbacks"
const readToken = () => { try { const m = fs.readFileSync("/etc/ohana/wb.conf", "utf8").match(/WB_TOKEN=(\S+)/); return m ? m[1] : "" } catch { return "" } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default async function syncWbReviews({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const quiet = (args || []).includes("quiet")
  const token = readToken()
  if (!token) { logger.warn("WB: нет токена в /etc/ohana/wb.conf — пропускаем"); return }
  const get = async (url: string): Promise<any | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, { headers: { Authorization: token }, signal: AbortSignal.timeout(90000) })
        if (r.status === 429) { await sleep(3000 * (attempt + 1)); continue }
        if (!r.ok) return null
        const j: any = await r.json()
        if (!j || j.error) return null
        return j.data ?? null
      } catch { await sleep(1000) }
    }
    return null
  }
  const { rows: ours } = await pg.raw(`select distinct metadata->>'code' as code from product where deleted_at is null and coalesce(metadata->>'code','') <> ''`)
  const our = new Set<string>(ours.map((r: any) => String(r.code)))
  const { rows: known } = await pg.raw(`select product_code, nm_id from ohana_wb_rating where nm_id > 0`)
  const code2nm = new Map<string, number>(known.map((r: any) => [String(r.product_code), Number(r.nm_id)]))

  // PASS 1: последние отзывы → новые артикулы
  let skip = 0, stale = 0
  for (let page = 0; page < 12; page++) {
    const data = await get(`${API}?isAnswered=true&take=5000&skip=${skip}&order=dateDesc`)
    const list: any[] = data?.feedbacks || []
    if (!list.length) break
    let fresh = 0
    for (const f of list) { const a = String(f.productDetails?.supplierArticle || ""), nm = Number(f.productDetails?.nmId) || 0; if (a && nm && our.has(a) && !code2nm.has(a)) { code2nm.set(a, nm); fresh++ } }
    if (!quiet) logger.info(`  стр.${page} (skip=${skip}): +${fresh} артикулов, всего ${code2nm.size}`)
    stale = fresh ? 0 : stale + 1
    if (stale >= 3 || list.length < 5000) break
    skip += 5000
    await sleep(700)
  }

  // PASS 2: по каждому nmId — точный счёт, средняя, тексты
  let updated = 0, inserted = 0
  for (const [code, nm] of code2nm) {
    if (!our.has(code)) continue
    let count = 0, sum = 0, texts = 0
    const rows: any[][] = []
    for (const ans of ["true", "false"]) {
      for (let sk = 0; sk < 30000; sk += 5000) {
        const data = await get(`${API}?isAnswered=${ans}&take=5000&skip=${sk}&nmId=${nm}&order=dateDesc`)
        const list: any[] = data?.feedbacks || []
        for (const f of list) {
          const val = Number(f.productValuation) || 0
          count++; sum += val
          const body = String(f.text || "").trim()
          if (body) {
            texts++
            rows.push([`wbf_${String(f.id).replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`, String(f.id), code, nm, val, String(f.userName || "").slice(0, 128), body.slice(0, 4000), String(f.createdDate || "")])
          }
        }
        if (list.length < 5000) break
        await sleep(400)
      }
    }
    if (!count) continue
    const rating = Math.round((sum / count) * 100) / 100
    await pg.raw(`insert into ohana_wb_rating (id, product_code, nm_id, rating, reviews_count, text_count, synced_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, now(), now(), now())
      on conflict (product_code) where deleted_at is null do update set nm_id = excluded.nm_id, rating = excluded.rating, reviews_count = excluded.reviews_count, text_count = excluded.text_count, synced_at = now(), updated_at = now()`,
      [`wbr_${code.replace(/[^A-Za-z0-9]/g, "")}_${nm}`, code, nm, rating, count, texts])
    updated++
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const res = await pg.raw(`insert into ohana_wb_review (id, feedback_id, product_code, nm_id, valuation, author, body, created_date, created_at, updated_at) values ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, now(), now())").join(",")} on conflict (feedback_id) where deleted_at is null do nothing`, chunk.flat())
      inserted += Number(res?.rowCount) || 0
    }
    await sleep(300)
  }
  logger.info(`WB: артикулов с рейтингом ${updated}, новых текстов отзывов ${inserted}`)
}
