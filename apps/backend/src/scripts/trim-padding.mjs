// Обрезка белых/прозрачных полей у веб-копий фото товаров из указанных категорий (соки из 1С приходят 3:4 с пустым низом).
// Запуск из apps/storefront (там sharp): node /root/trim_padding.mjs <handle категории> [dry]
import sharp from "sharp"
import { execSync } from "node:child_process"
import fs from "node:fs"
const [handle, dry] = process.argv.slice(2)
const sql = `select distinct i.url from image i join product_category_product pc on pc.product_id=i.product_id join product_category c on c.id=pc.product_category_id where c.handle='${handle}' and i.deleted_at is null`
const urls = execSync(`sudo -u postgres psql -d ohana_shop -Atc "${sql}"`).toString().trim().split("\n").filter(Boolean)
let changed = 0
for (const u of urls) {
  const f = "/srv/ohana/shared/images/" + u.replace(/^https:\/\/api\.ohanaopt\.ru\/images\//, "")
  if (!fs.existsSync(f)) { console.log("нет файла", f); continue }
  const meta = await sharp(f).metadata()
  // прозрачный низ (PNG из 1С) и белые поля — одинаково: сначала кладём на белый, потом режем белое
  const trimmed = await sharp(f).flatten({ background: "#ffffff" }).trim({ background: "#ffffff", threshold: 14 }).toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = trimmed.info
  const gain = 1 - (w * h) / (meta.width * meta.height)
  console.log(`${f.split("/").pop().slice(0, 40)} ${meta.width}x${meta.height} → ${w}x${h} (−${(gain * 100).toFixed(0)}%)`)
  if (gain > 0.15 && !dry) { fs.writeFileSync(f, trimmed.data); changed++ }
}
console.log(`изменено ${changed} из ${urls.length}`)
