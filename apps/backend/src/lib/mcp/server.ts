/**
 * MCP-сервер нового магазина (Streamable HTTP, JSON-RPC 2.0) — тот же протокол и набор инструментов,
 * что у mcp.ohanaopt.ru (опт) и розницы, но внутри Medusa: инструменты ходят в Postgres и файлы напрямую.
 * Доступ: Bearer-токен или секрет в пути /mcp/<токен>; уровни read / admin; allow_cidr по X-Forwarded-For (за Caddy).
 * Конфиг /etc/ohana/mcp.conf (root:ohana 0640): store, store_url, allow_cidr, read_token, admin_token, kb_dir, ssl_hosts.
 */
import { execFile, spawn } from "child_process"
import fs from "fs"
import path from "path"
import { OnecMcp } from "../onec-mcp"

const CONF = process.env.OHANA_MCP_CONF || "/etc/ohana/mcp.conf"
const REPO = "/srv/ohana/apps/shop"
const LOG = "/srv/ohana/logs/mcp.log"
export const PROTOCOL_VERSION = "2025-11-25"
export const ADMIN_TOOLS = ["kb_write", "onec_call", "shell"]

export function conf(): Record<string, string> {
  const c: Record<string, string> = {}
  try {
    for (const line of fs.readFileSync(CONF, "utf8").split("\n")) {
      const t = line.trim(); if (!t || t.startsWith("#") || !t.includes("=")) continue
      const i = t.indexOf("="); c[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  } catch {}
  return c
}
export const logline = (msg: string) => { try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`) } catch {} }

// ---------- доступ ----------
const ipToBytes = (ip: string): Buffer | null => {
  if (ip.includes(".") && !ip.includes(":")) { const p = ip.split(".").map(Number); return p.length === 4 && p.every((x) => x >= 0 && x <= 255) ? Buffer.from(p) : null }
  const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); if (v4) return ipToBytes(v4[1])
  const [head, tail] = ip.split("::"); const h = head ? head.split(":") : [], t = tail ? tail.split(":") : []
  if (h.length + t.length > 8) return null
  const parts = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t]
  const b = Buffer.alloc(16); parts.forEach((x, i) => b.writeUInt16BE(parseInt(x || "0", 16), i * 2)); return b
}
const inCidr = (ip: string, cidr: string) => {
  const [net, bitsS] = cidr.split("/"); const a = ipToBytes(ip), n = ipToBytes(net)
  if (!a || !n || a.length !== n.length) return false
  const bits = bitsS === undefined ? a.length * 8 : Number(bitsS)
  for (let i = 0; i < a.length; i++) {
    const rem = bits - i * 8; if (rem <= 0) return true
    const mask = rem >= 8 ? 0xff : (0xff << (8 - rem)) & 0xff
    if ((a[i] & mask) !== (n[i] & mask)) return false
  }
  return true
}
export const clientIp = (req: any) => String((req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "")
export const ipAllowed = (req: any) => { const list = (conf().allow_cidr || "").split(",").map((s) => s.trim()).filter(Boolean); return !list.length || list.some((c) => inCidr(clientIp(req), c)) }
export const authLevel = (req: any, pathToken?: string): "admin" | "read" | null => {
  const hdr = String(req.headers["authorization"] || ""); const m = hdr.match(/Bearer\s+(\S+)/i)
  const token = m ? m[1] : pathToken || ""
  if (!token) return null
  const c = conf()
  if (c.admin_token && token === c.admin_token) return "admin"
  if (c.read_token && token === c.read_token) return "read"
  return null
}

// ---------- утилиты ----------
const sh = (cmd: string, timeoutMs = 20000): Promise<string> => new Promise((resolve) => {
  execFile("/bin/bash", ["-lc", cmd], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, LANG: "C.UTF-8" } }, (err, out, errOut) => resolve(String(out || "") + (errOut ? `\n[stderr] ${String(errOut).slice(0, 2000)}` : "") + (err && (err as any).killed ? "\n[таймаут]" : "")))
})
const money = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`
const kbDir = () => path.join(REPO, (conf().kb_dir || "kb").replace(/[^a-z0-9_/-]/gi, ""))
const kbFiles = () => { const d = kbDir(); const list = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => path.join(d, f)) : []; return [path.join(REPO, "OPS.md"), ...list].filter((f) => fs.existsSync(f)) }
const kbName = (f: string) => (path.basename(f) === "OPS.md" ? "ops" : path.basename(f, ".md"))
const kbMeta = (f: string) => { const text = fs.readFileSync(f, "utf8"); const m = text.match(/^#\s*(.+)$/m); return { name: kbName(f), title: m ? m[1].trim() : kbName(f), text } }
const stem = (w: string) => (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w)

// ---------- инструменты ----------
type Ctx = { pg: any; query: any; level: string }

async function toolOrientation() {
  const f = path.join(kbDir(), "orientation.md")
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "База знаний не заполнена: нет kb/orientation.md. Читай kb_get name=ops (OPS.md)."
}
async function toolPlatformMap() {
  const c = conf()
  const out = [`# Карта установки (${c.store || "newshop"}, ${c.store_url || ""})`, ""]
  out.push("## Версии", await sh(`node -v; cd ${REPO} && node -e "const p=require('./apps/backend/package.json');console.log('medusa', p.dependencies['@medusajs/medusa']); const s=require('./apps/storefront/package.json');console.log('next', s.dependencies.next)"`))
  out.push("## Git", await sh(`cd ${REPO} && git log --oneline -8 && git status --short | head -20`))
  out.push("## Службы", await sh(`for s in ohana-backend ohana-storefront caddy postgresql redis-server; do printf -- "- %s: %s\\n" "$s" "$(systemctl is-active $s 2>/dev/null)"; done`))
  out.push("## Крон (/etc/cron.d/ohana-shop)", await sh(`grep -v '^#' /etc/cron.d/ohana-shop | grep -v '^$'`))
  out.push("## Свои маршруты API", await sh(`cd ${REPO}/apps/backend/src/api && find . -name route.ts | sed 's#^\\./##; s#/route.ts##' | sort`))
  out.push("## Скрипты", await sh(`ls ${REPO}/apps/backend/src/scripts`))
  return out.join("\n")
}
async function toolHealth(a: any) {
  const hours = Math.max(1, Math.min(720, Number(a.hours) || 24))
  const out = ["# Состояние магазина", ""]
  out.push(await sh(`df -h /srv | tail -1 | awk '{print "Диск: "$3" из "$2" ("$5")"}'`))
  out.push("## Службы", await sh(`for s in ohana-backend ohana-storefront caddy postgresql redis-server; do printf -- "- %s: %s\\n" "$s" "$(systemctl is-active $s 2>/dev/null)"; done`))
  out.push(`## Ошибки бэкенда за ${hours} ч`, await sh(`journalctl -u ohana-backend --since "${hours} hours ago" --no-pager -q 2>/dev/null | grep -i '"level":"error"' | tail -8 | cut -c1-300 || echo "journalctl недоступен"`))
  out.push("## Ночной конвейер 1С (последние строки)", await sh(`tail -12 /srv/ohana/logs/cml-nightly.log 2>/dev/null`))
  out.push("## Остатки из 1С (последний прогон)", await sh(`tail -2 /srv/ohana/logs/sync-1c-stock.log 2>/dev/null | cut -c1-200`))
  out.push("## Заказы", await sh(`sudo -n -u postgres psql ohana_shop -Atc "select 'всего '||count(*)||', последний '||coalesce(max(created_at)::text,'—') from \\"order\\" where deleted_at is null" 2>/dev/null || echo "(psql недоступен от ohana — см. sales_summary)"`))
  return out.join("\n")
}
async function toolServerStatus() {
  const hosts = (conf().ssl_hosts || "api.ohanaopt.ru, new.ohanaopt.ru").split(",").map((s) => s.trim()).filter(Boolean)
  const out = ["# Состояние VPS", ""]
  out.push(await sh(`uptime -p; echo "Нагрузка: $(cut -d' ' -f1-3 /proc/loadavg)"`))
  out.push("## Память", await sh(`free -h | sed -n 2p`))
  out.push("## Диски", await sh(`df -h -x tmpfs -x devtmpfs | tail -n +2 | awk '{print "- "$1" "$2" "$3" "$4" "$5" "$6}'`))
  out.push("## Службы", await sh(`for s in ohana-backend ohana-storefront caddy postgresql redis-server cron; do printf -- "- %s: %s\\n" "$s" "$(systemctl is-active $s 2>/dev/null)"; done`))
  out.push("## Сертификаты (дней до конца)")
  for (const h of hosts) out.push(await sh(`d=$(echo | openssl s_client -servername ${h} -connect ${h}:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); [ -n "$d" ] && echo "- ${h}: $(( ($(date -d "$d" +%s) - $(date +%s)) / 86400 ))" || echo "- ${h}: нет ответа"`))
  out.push("## Процессы по памяти", await sh(`ps -eo rss,comm --sort=-rss | head -6 | awk 'NR>1{printf "- %s %.0f МБ\\n",$2,$1/1024}'`))
  return out.join("\n")
}
async function toolSalesSummary(ctx: Ctx, a: any) {
  const days = Math.max(1, Math.min(730, Number(a.days) || 30))
  const from = a.date_from ? new Date(a.date_from) : new Date(Date.now() - days * 86400000)
  const to = a.date_to ? new Date(a.date_to + "T23:59:59") : new Date()
  const { data: orders } = await ctx.query.graph({ entity: "order", fields: ["id", "display_id", "status", "created_at", "total", "metadata"], filters: { created_at: { $gte: from.toISOString(), $lte: to.toISOString() } } })
  const byStatus = new Map<string, { n: number; sum: number }>(), byDay = new Map<string, { n: number; sum: number }>()
  let sum = 0
  for (const o of orders) { const t = Number(o.total) || 0; sum += t; const s = byStatus.get(o.status) || { n: 0, sum: 0 }; s.n++; s.sum += t; byStatus.set(o.status, s); const d = String(o.created_at).slice(0, 10); const dd = byDay.get(d) || { n: 0, sum: 0 }; dd.n++; dd.sum += t; byDay.set(d, dd) }
  const out = [`# Заказы с ${from.toLocaleDateString("ru-RU")} по ${to.toLocaleDateString("ru-RU")}`, "", `Всего: ${orders.length} заказов на ${money(sum)}, средний чек ${orders.length ? money(sum / orders.length) : "—"}`, "", "## По статусам"]
  for (const [s, v] of byStatus) out.push(`- ${s}: ${v.n} на ${money(v.sum)}`)
  out.push("", "## Последние дни")
  for (const [d, v] of [...byDay.entries()].sort((x, y) => y[0].localeCompare(x[0])).slice(0, 14)) out.push(`- ${d}: ${v.n} заказов, ${money(v.sum)}`)
  out.push("", `В 1С передано: ${orders.filter((o) => o.metadata?.onec_number).length}`)
  return out.join("\n")
}
async function toolProductFind(ctx: Ctx, a: any) {
  const q = String(a.query || "").trim(); if (!q) throw new Error("пустой запрос")
  const limit = Math.max(1, Math.min(50, Number(a.limit) || 10))
  const { rows } = await ctx.pg.raw(`select p.id, p.handle, p.title, p.status, p.thumbnail is not null as has_photo, p.metadata,
      (select count(*) from image i where i.product_id = p.id and i.deleted_at is null)::int as images,
      (select string_agg(c.name, ', ') from product_category_product pcp join product_category c on c.id = pcp.product_category_id where pcp.product_id = p.id) as cats
    from product p where p.deleted_at is null and (p.metadata->>'code' ilike ? or p.title ilike ? or p.handle = ? or p.id = ?) order by p.title limit ?`, [`${q}%`, `%${q}%`, q, q, limit])
  if (!rows.length) return `Ничего не найдено по запросу «${q}».`
  const out = [`# Найдено: ${rows.length}`, ""]
  for (const p of rows) {
    const m = p.metadata || {}
    const { rows: vs } = await ctx.pg.raw(`select v.sku, v.metadata->>'size' as size, v.metadata as vm,
        (select min(pr.amount) from product_variant_price_set ps join price pr on pr.price_set_id = ps.price_set_id and pr.price_list_id is null and pr.currency_code='rub' and pr.deleted_at is null where ps.variant_id = v.id)::float as opt,
        coalesce((select sum(il.stocked_quantity - il.reserved_quantity) from product_variant_inventory_item vi join inventory_level il on il.inventory_item_id = vi.inventory_item_id where vi.variant_id = v.id and vi.deleted_at is null and il.deleted_at is null),0)::float as stock
      from product_variant v where v.product_id = ? and v.deleted_at is null order by v.variant_rank`, [p.id])
    out.push(`## ${p.title} (арт. ${m.code || "—"}, ${p.status}${p.has_photo ? "" : ", БЕЗ ФОТО"})`)
    out.push(`- handle: ${p.handle} · id ${p.id} · GUID 1С ${m.guid || "—"} · фото ${p.images}`)
    out.push(`- категории: ${p.cats || "—"}; продажа: ${m.lineika ? `комплектом ${m.set_qty} шт` : m.pack ? `упаковками ${m.set_qty} шт` : "поштучно"}; теги: ${(m.tags || []).join(", ") || "—"}`)
    for (const v of vs) out.push(`- ${v.sku} (${v.size || "—"}): опт ${v.opt ? money(v.opt) : "—"}, крупный опт ${v.vm?.price_krupny ? money(Number(v.vm.price_krupny)) : "—"}${v.vm?.price_sale ? `, акция ${money(Number(v.vm.price_sale))}` : ""}, остаток ${v.stock}`)
    out.push("")
  }
  return out.join("\n")
}
async function toolStockReport(ctx: Ctx, a: any) {
  const kind = String(a.kind || "low"), limit = Math.max(1, Math.min(200, Number(a.limit) || 50)), thr = Math.max(0, Number(a.threshold) || 5)
  const stock = `coalesce((select sum(il.stocked_quantity - il.reserved_quantity) from product_variant v join product_variant_inventory_item vi on vi.variant_id = v.id and vi.deleted_at is null join inventory_level il on il.inventory_item_id = vi.inventory_item_id and il.deleted_at is null where v.product_id = p.id and v.deleted_at is null),0)`
  const where = kind === "zero" ? `p.status='published' and ${stock} <= 0` : kind === "no_price" ? `p.status='published' and not exists (select 1 from product_variant v join product_variant_price_set ps on ps.variant_id=v.id join price pr on pr.price_set_id=ps.price_set_id and pr.price_list_id is null and pr.amount>0 where v.product_id=p.id)` : kind === "no_image" ? `p.status='published' and p.thumbnail is null` : `p.status='published' and ${stock} > 0 and ${stock} <= ${thr}`
  const title = { zero: "Опубликованные товары с нулевым остатком", no_price: "Опубликованные товары без цены", no_image: "Опубликованные товары без фото (в каталоге скрыты)" }[kind] || `Заканчиваются (остаток ≤ ${thr})`
  const { rows } = await ctx.pg.raw(`select p.title, p.metadata->>'code' as code, ${stock}::float as stock, count(*) over() as total from product p where p.deleted_at is null and ${where} order by 3 asc, p.title limit ?`, [limit])
  const out = [`# ${title}`, "", `Всего: ${rows[0]?.total || 0}, показано ${rows.length}`, ""]
  for (const r of rows) out.push(`- ${r.title} (арт. ${r.code || "—"}) — остаток ${r.stock}`)
  return out.join("\n")
}
async function toolKbList() {
  const files = kbFiles(); if (!files.length) return "База знаний пуста."
  return [`# База знаний нового магазина: ${files.length} статей`, "", ...files.map((f) => { const m = kbMeta(f); return `- **${m.name}** — ${m.title} (${m.text.length} символов)` })].join("\n")
}
async function toolKbSearch(a: any) {
  const q = String(a.query || "").toLowerCase().trim(); if (!q) throw new Error("пустой запрос")
  const limit = Math.max(1, Math.min(30, Number(a.limit) || 8))
  const stems = [...new Set(q.split(/[^\p{L}\p{N}_-]+/u).filter((w) => w.length >= 3).map(stem))]
  const hits: any[] = []
  for (const f of kbFiles()) {
    const m = kbMeta(f); const low = (m.title + "\n" + m.text).toLowerCase()
    let matched = 0, score = 0, first: number | null = null
    for (const st of stems.length ? stems : [q]) { const n = low.split(st).length - 1; if (!n) continue; matched++; score += n; const pos = low.indexOf(st); if (first === null || pos < first) first = pos }
    if (!matched) continue
    hits.push({ ...m, matched, score, frag: m.text.slice(Math.max(0, (first || 0) - 120), (first || 0) + 200).trim() })
  }
  if (!hits.length) return `По запросу «${q}» ничего нет. Посмотри kb_list.`
  hits.sort((x, y) => y.matched - x.matched || y.score - x.score)
  return [`# Найдено: ${Math.min(hits.length, limit)}`, "", ...hits.slice(0, limit).flatMap((h) => [`## ${h.name} — ${h.title} (совпадений ${h.score})`, `…${h.frag}…`, `Целиком: kb_get name=${h.name}`, ""])].join("\n")
}
async function toolKbGet(a: any) {
  const name = String(a.name || "").replace(/[^a-z0-9_-]/gi, ""); if (!name) throw new Error("пустое имя")
  const f = kbFiles().find((x) => kbName(x) === name)
  return f ? fs.readFileSync(f, "utf8") : `Статьи «${name}» нет. Оглавление: kb_list.`
}
async function toolKbWrite(a: any) {
  const name = String(a.name || "").replace(/[^a-z0-9_-]/gi, ""); const title = String(a.title || "").trim(); const content = String(a.content || "")
  if (!name || !title || !content) throw new Error("нужны name (латиницей), title и content")
  if (name === "ops") throw new Error("OPS.md правится в репозитории напрямую, не через kb_write")
  fs.mkdirSync(kbDir(), { recursive: true })
  const f = path.join(kbDir(), `${name}.md`); const existed = fs.existsSync(f)
  fs.writeFileSync(f, `# ${title}\n\n${content.trim()}\n`)
  const msg = `${existed ? "обновлена" : "добавлена"} статья ${name}`
  const rel = path.relative(REPO, kbDir())
  const git = await sh(`cd ${REPO} && git add ${rel} && git -c user.name="Ohana MCP newshop" -c user.email="molchanovev@gmail.com" commit -q -m "kb(newshop): ${msg}" 2>&1; git push 2>&1 | tail -2`, 60000)
  return `Готово: ${msg}\n\nGit:\n${git.trim() || "без изменений"}`
}
async function toolShell(a: any) {
  const cmd = String(a.command || ""); if (!cmd.trim()) throw new Error("пустая команда")
  const timeout = Math.max(1, Math.min(300, Number(a.timeout) || 60))
  if (/rm\s+-[rf]{2}\s+\/(\s|$)|mkfs|dd\s+if=.*of=\/dev\//.test(cmd)) throw new Error("команда отклонена стоп-листом")
  const asRoot = fs.existsSync("/usr/local/sbin/ohana-mcp-exec")
  try { fs.appendFileSync("/srv/ohana/logs/mcp-shell.log", `${new Date().toISOString()} ${asRoot ? "root" : "ohana"}: ${cmd.replace(/\s+/g, " ").slice(0, 500)}\n`) } catch {}
  return new Promise<string>((resolve) => {
    const child = asRoot ? spawn("sudo", ["-n", "/usr/local/sbin/ohana-mcp-exec", cmd, String(timeout)]) : spawn("/bin/bash", ["-lc", cmd], { cwd: REPO, env: { ...process.env, LANG: "C.UTF-8" } })
    let out = ""; const cap = (d: Buffer) => { if (out.length < 200000) out += d.toString() }
    child.stdout.on("data", cap); child.stderr.on("data", cap)
    const t = setTimeout(() => { child.kill("SIGKILL"); out += "\n[таймаут]" }, timeout * 1000)
    child.on("close", (code) => { clearTimeout(t); resolve(`${out.trim() || "(пусто)"}\n\n[код возврата ${code}, выполнено от ${asRoot ? "root" : "ohana"}]`) })
  })
}

export const CATALOG = [
  { name: "orientation", description: "НАЧНИ С ЭТОГО. Как устроен новый магазин на Medusa: адреса, деплой, данные из 1С, ловушки. Читать до любых изменений.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "platform_map", description: "Живое состояние установки: версии, последние коммиты, службы, крон, свои маршруты API и скрипты.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "sales_summary", description: "Сводка заказов за период: количество, сумма, средний чек, статусы, по дням. Без персональных данных.", inputSchema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 730 }, date_from: { type: "string" }, date_to: { type: "string" } }, additionalProperties: false } },
  { name: "product_find", description: "Найти товар по артикулу, названию, handle или id: варианты, цены опт/крупный опт/акция, остатки, теги, режим продажи.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } }, required: ["query"], additionalProperties: false } },
  { name: "stock_report", description: "Остатки: заканчивающиеся, распроданные, без цены, без фото (скрытые из каталога).", inputSchema: { type: "object", properties: { kind: { type: "string", enum: ["low", "zero", "no_price", "no_image"] }, threshold: { type: "integer" }, limit: { type: "integer", minimum: 1, maximum: 200 } }, required: ["kind"], additionalProperties: false } },
  { name: "health", description: "Состояние магазина: службы, ошибки бэкенда, ночной конвейер 1С, остатки, заказы.", inputSchema: { type: "object", properties: { hours: { type: "integer" } }, additionalProperties: false } },
  { name: "kb_search", description: "Поиск по базе знаний нового магазина (OPS.md + статьи kb/ в репозитории Sign25/ohana-shop).", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["query"], additionalProperties: false } },
  { name: "kb_get", description: "Прочитать статью базы знаний целиком (name=ops — весь OPS.md).", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { name: "kb_list", description: "Оглавление базы знаний нового магазина.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "kb_write", description: "Записать или обновить статью базы знаний (коммит и пуш в Sign25/ohana-shop). Требует токен admin.", inputSchema: { type: "object", properties: { name: { type: "string" }, title: { type: "string" }, content: { type: "string" } }, required: ["name", "title", "content"], additionalProperties: false } },
  { name: "server_status", description: "Состояние VPS: аптайм, нагрузка, память, диски, службы, сроки SSL, процессы. Только чтение.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "onec_tools", description: "Список инструментов 1С:КА2, доступных через этот сервер. Смотреть перед onec_call.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "onec_call", description: "Вызвать инструмент 1С:КА2 (запрос, отчёт, метаданные). Боевая база — нужен токен admin.", inputSchema: { type: "object", properties: { tool: { type: "string" }, arguments: { type: "object" } }, required: ["tool"], additionalProperties: false } },
  { name: "shell", description: "Выполнить команду на сервере нового магазина (от пользователя ohana; от root — если установлен ohana-mcp-exec). Журнал /srv/ohana/logs/mcp-shell.log. Требует токен admin.", inputSchema: { type: "object", properties: { command: { type: "string" }, timeout: { type: "integer", minimum: 1, maximum: 300 } }, required: ["command"], additionalProperties: false } },
]

export async function runTool(name: string, args: any, ctx: Ctx): Promise<string> {
  const a = args && typeof args === "object" ? args : {}
  switch (name) {
    case "orientation": return toolOrientation()
    case "platform_map": return toolPlatformMap()
    case "sales_summary": return toolSalesSummary(ctx, a)
    case "product_find": return toolProductFind(ctx, a)
    case "stock_report": return toolStockReport(ctx, a)
    case "health": return toolHealth(a)
    case "kb_search": return toolKbSearch(a)
    case "kb_get": return toolKbGet(a)
    case "kb_list": return toolKbList()
    case "kb_write": return toolKbWrite(a)
    case "server_status": return toolServerStatus()
    case "onec_tools": { const t = await new OnecMcp().tools(); return [`# Инструменты 1С (${t.length})`, "", ...t.map((x: any) => `- **${x.name}** — ${String(x.description || "").slice(0, 200)}`)].join("\n") }
    case "onec_call": return new OnecMcp().call(String(a.tool || ""), a.arguments || {})
    case "shell": return toolShell(a)
    default: throw new Error(`неизвестный инструмент: ${name}`)
  }
}
