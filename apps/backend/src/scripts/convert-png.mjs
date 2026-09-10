// Разовая конвертация веб-копий PNG (4,4 ГБ, ~1,4 МБ на файл) в JPEG q82 на белом фоне: <имя>.png → <имя>.jpg рядом.
// PNG-файлы не удаляет — это делается после переключения ссылок в БД (см. OPS.md). Запуск: node ./src/scripts/convert-png.mjs
import sharp from "sharp"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
const ROOT = "/srv/ohana/shared/images/web", Q = 82, PAR = Math.max(2, os.cpus().length - 1)
async function* walk(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) yield* walk(p); else if (/\.png$/i.test(e.name)) yield p } }
const files = []; for await (const f of walk(ROOT)) files.push(f)
let done = 0, skipped = 0, failed = 0; const t0 = Date.now()
async function one(src) {
  const out = src.replace(/\.png$/i, ".jpg")
  if (await fs.stat(out).then((s) => s.size > 0).catch(() => false)) { skipped++; return }
  try { await sharp(src, { failOn: "none" }).flatten({ background: "#ffffff" }).jpeg({ quality: Q, mozjpeg: true }).toFile(out); done++ }
  catch (e) { failed++; console.error("FAIL", src, e.message) }
}
let i = 0
await Promise.all(Array.from({ length: PAR }, async () => { while (i < files.length) { await one(files[i++]); if ((done + skipped) % 500 === 0) console.log(`${done + skipped}/${files.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`) } }))
console.log(`done ${done}, skipped ${skipped}, failed ${failed}, ${((Date.now() - t0) / 1000).toFixed(0)}s`)
