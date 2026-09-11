/**
 * Общие промо-картинки («Лауреат премий», визитки бренда) приходят из 1С как фото многих номенклатур
 * и попадают главным фото. Считаем md5 файлов всех фото; картинка у ≥3 товаров — общая: переносим в конец галереи,
 * главным ставим первое «своё» фото; если своих нет — thumbnail снимаем (каталог такие товары не показывает).
 * Кэш md5 — /srv/ohana/shared/images/.md5cache.json.   npx medusa exec ./src/scripts/fix-shared-images.ts [dry]
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import crypto from "crypto"
import fs from "fs"
import path from "path"

const IMG_DIR = "/srv/ohana/shared/images"
const CACHE = path.join(IMG_DIR, ".md5cache.json")
const SHARED_MIN = Number(process.env.SHARED_MIN) || 10 // промо-карточки сидят у десятков товаров; общее фото всех расцветок одной модели (3–8 товаров) — не трогаем

export default async function fixSharedImages({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dry = (args || []).includes("dry")
  const cache: Record<string, string> = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {}
  const md5 = (url: string): string | null => {
    const m = url.match(/\/images\/(.+)$/); if (!m) return null
    const rel = decodeURIComponent(m[1]); if (cache[rel]) return cache[rel]
    const f = path.join(IMG_DIR, rel); if (!fs.existsSync(f)) return null
    try { const st = fs.statSync(f); const h = st.size < 5 * 1024 * 1024 ? crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex") : `big:${st.size}`; cache[rel] = h; return h } catch { return null }
  }
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "thumbnail", "metadata", "images.id", "images.url", "images.rank"] })
  const owners = new Map<string, Set<string>>()
  for (const p of products) for (const im of p.images || []) { const h = md5(im.url); if (h) owners.set(h, (owners.get(h) || new Set()).add(p.id)) }
  fs.writeFileSync(CACHE, JSON.stringify(cache))
  const shared = new Set([...owners.entries()].filter(([, s]) => s.size >= SHARED_MIN).map(([h]) => h))
  if (dry) {
    const sample = new Map<string, string>()
    for (const p of products) for (const im of p.images || []) { const h = md5(im.url); if (h && !sample.has(h)) sample.set(h, im.url) }
    for (const [h, s] of [...owners.entries()].filter(([, s]) => s.size >= 3).sort((a, b) => b[1].size - a[1].size).slice(0, 40)) logger.info(`  ${String(s.size).padStart(4)} товаров: ${path.basename(sample.get(h) || h)}`)
  }
  let fixed = 0, noPhoto = 0
  const noPhotoList: string[] = []
  for (const p of products) {
    const imgs = [...(p.images || [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    if (!imgs.length) continue
    const own = imgs.filter((im) => !shared.has(md5(im.url) || "")), sh = imgs.filter((im) => shared.has(md5(im.url) || ""))
    if (!sh.length) continue
    const ordered = [...own, ...sh]
    const wantThumb = own[0]?.url || null
    const sameOrder = ordered.every((im, i) => im.id === imgs[i].id)
    if (sameOrder && p.thumbnail === wantThumb) continue
    logger.info(`${p.metadata?.code || ""} ${p.title}: своих ${own.length}, общих ${sh.length}${wantThumb ? "" : " — без своего фото"}`)
    if (!dry) await updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { thumbnail: wantThumb, images: ordered.map((im) => ({ url: im.url })) } } })
    fixed++; if (!wantThumb) { noPhoto++; noPhotoList.push(`${p.metadata?.code || "-"}\t${p.title}`) }
  }
  // товары, у которых в 1С нет своего фото (в каталоге не показываются) — список для владельца
  if (!dry) { try { fs.mkdirSync("/srv/ohana/logs", { recursive: true }); fs.writeFileSync("/srv/ohana/logs/no-photo.tsv", noPhotoList.join("\n") + "\n") } catch {} }
  logger.info(`общих картинок: ${shared.size}; исправлено товаров: ${fixed} (без своего фото: ${noPhoto})${dry ? " (dry)" : ""}`)
}
