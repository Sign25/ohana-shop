// Пережатие исходных фото CS-Cart (3–5 тыс. px, 2–5 МБ) в веб-копии ≤1400px для витрины.
// Вход /srv/ohana/shared/images/detailed → выход /srv/ohana/shared/images/web (та же структура путей).
import sharp from "sharp"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
const SRC = "/srv/ohana/shared/cml/import_files", DST = "/srv/ohana/shared/images/web/cml"
const MAX = 1400, Q = 82, PAR = Math.max(2, os.cpus().length)
async function* walk(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) yield* walk(p); else yield p } }
const files = []; for await (const f of walk(SRC)) files.push(f)
let done = 0, skipped = 0, failed = 0; const t0 = Date.now()
async function one(src) {
  // PNG отдаём как JPEG на белом фоне: PNG-копии весили по 1–3 МБ и тормозили каталог
  const rel = path.relative(SRC, src), out = path.join(DST, rel).replace(/\.png$/i, ".jpg")
  try { const [a, b] = await Promise.all([fs.stat(src), fs.stat(out).catch(() => null)]); if (b && b.size > 0 && (b.mtimeMs >= a.mtimeMs || a.mtimeMs > Date.now())) { skipped++; return } /* имена файлов 1С содержат GUID — содержимое под тем же именем не меняется; mtime из 1С бывает «в будущем» */ } catch {}
  await fs.mkdir(path.dirname(out), { recursive: true })
  try {
    const ext = path.extname(src).toLowerCase()
    let img = sharp(src, { failOn: "none" }).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    if (ext === ".png") img = img.flatten({ background: "#ffffff" }).jpeg({ quality: Q, mozjpeg: true }); else if (ext === ".webp") img = img.webp({ quality: Q }); else img = img.jpeg({ quality: Q, mozjpeg: true })
    await img.toFile(out); done++
  } catch (e) { failed++; console.error("FAIL", rel, e.message) }
}
let i = 0
await Promise.all(Array.from({ length: PAR }, async () => { while (i < files.length) { const f = files[i++]; await one(f); if ((done + skipped) % 500 === 0) console.log(`${done + skipped}/${files.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`) } }))
console.log(`done ${done}, skipped ${skipped}, failed ${failed}, ${((Date.now() - t0) / 1000).toFixed(0)}s`)
