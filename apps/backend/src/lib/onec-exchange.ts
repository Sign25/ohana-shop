/**
 * Обмен с 1С по протоколу «Обмен с сайтом» (CommerceML 2): приём каталога (checkauth/init/file/import)
 * и выдача заказов (sale: query/success/file). Логин и пароль — ONEC_EXCHANGE_LOGIN / ONEC_EXCHANGE_PASSWORD
 * в apps/backend/.env (те же вписываются в узел ОбменССайтом в 1С).
 */
import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import { spawn } from "child_process"

export const CML_DIR = process.env.CML_DIR || "/srv/ohana/shared/cml"
export const CML_LOG = process.env.CML_LOG || "/srv/ohana/logs/commerceml.log"
export const PIPELINE = process.env.CML_PIPELINE || "/srv/ohana/bin/cml-nightly.sh"
export const COOKIE_NAME = "onec_session"

export const log = (msg: string) => {
  const line = `${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Moscow" })} ${msg}\n` // МСК, как в логе конвейера
  try { fs.appendFileSync(CML_LOG, line) } catch {}
}

const secret = () => process.env.ONEC_EXCHANGE_PASSWORD || process.env.COOKIE_SECRET || "onec"
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex").slice(0, 32)

/** Проверка Basic-auth (checkauth) или сессионной куки/sessid (остальные запросы) */
export function authorize(headers: Record<string, any>, query: Record<string, any>): { ok: boolean; sessid?: string } {
  const login = process.env.ONEC_EXCHANGE_LOGIN, pass = process.env.ONEC_EXCHANGE_PASSWORD
  if (!login || !pass) return { ok: false }
  const auth = String(headers.authorization || "")
  if (auth.startsWith("Basic ")) {
    const [l, p] = Buffer.from(auth.slice(6), "base64").toString("utf8").split(":")
    if (l === login && p === pass) return { ok: true, sessid: newSession() }
  }
  const cookie = String(headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE_NAME + "="))
  const sid = (cookie ? cookie.slice(COOKIE_NAME.length + 1) : "") || String(query.sessid || "")
  if (sid && validSession(sid)) return { ok: true, sessid: sid }
  return { ok: false }
}
const newSession = () => { const day = Math.floor(Date.now() / 86400000); return `${day}.${sign(String(day))}` }
const validSession = (sid: string) => { const [day, sig] = sid.split("."); const d = Number(day); return !!day && sign(day) === sig && Math.abs(Math.floor(Date.now() / 86400000) - d) <= 2 }

/** Безопасный путь внутри каталога обмена (1С шлёт import0_1.xml, offers0_1.xml, import_files/xx/…) */
export function safePath(filename: string): string | null {
  const rel = String(filename || "").replace(/\\/g, "/").replace(/^\/+/, "")
  if (!rel || rel.includes("..") || !/^[\w./\-]+$/.test(rel)) return null
  return path.join(CML_DIR, "inbox", rel)
}

/** Файл принят целиком (mode=import): xml — в рабочий каталог, картинки уже лежат в inbox/import_files → синхронизируем */
export function acceptFile(filename: string): "xml" | "image" | null {
  const src = safePath(filename); if (!src || !fs.existsSync(src)) return null
  const rel = path.relative(path.join(CML_DIR, "inbox"), src)
  if (/\.xml$/i.test(rel)) { fs.copyFileSync(src, path.join(CML_DIR, path.basename(rel))); return "xml" }
  const dst = path.join(CML_DIR, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); return "image"
}
/** Картинки из inbox/import_files переносим в рабочий каталог (1С не зовёт import для каждой картинки) */
export function syncImages() {
  const from = path.join(CML_DIR, "inbox", "import_files"), to = path.join(CML_DIR, "import_files")
  if (!fs.existsSync(from)) return 0
  let n = 0
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const dst = path.join(to, path.relative(from, p)); if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(p).size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(p, dst); n++ } } } }
  walk(from); return n
}

let running = false
/** Запуск конвейера импорта (без rsync) в фоне; параллельные запуски не плодим */
export function runPipeline(reason: string) {
  if (running) { log(`конвейер уже идёт, пропуск (${reason})`); return false }
  running = true
  log(`запуск конвейера: ${reason}`)
  const child = spawn("/bin/bash", [PIPELINE, "--no-rsync"], { cwd: process.env.CML_PIPELINE_CWD || "/srv/ohana/apps/shop/apps/backend", detached: true, stdio: ["ignore", fs.openSync(CML_LOG, "a"), fs.openSync(CML_LOG, "a")] })
  child.on("exit", (code) => { running = false; log(`конвейер завершён, код ${code}`) })
  child.unref()
  return true
}

// ---------- заказы → 1С ----------
const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const el = (name: string, v: any) => (v === undefined || v === null || v === "" ? "" : `<${name}>${esc(v)}</${name}>`)
const num = (v: any) => { const n = Number(v); return isFinite(n) ? String(Math.round(n * 100) / 100) : "" } // без хвоста «.0000000000»
const req = (name: string, v: any) => (v === undefined || v === null || v === "" ? "" : `<ЗначениеРеквизита>${el("Наименование", name)}${el("Значение", v)}</ЗначениеРеквизита>`)
const msk = (d: string | Date) => new Date(new Date(d).getTime() + 3 * 3600 * 1000).toISOString() // Омск = МСК+3, 1С ведёт по МСК? Оставляем МСК

export const ORDER_STATUS_RU: Record<string, string> = { pending: "Новый", completed: "Выполнен", canceled: "Отменён", archived: "Архив", requires_action: "Требует внимания", draft: "Черновик" }

export function orderToXml(o: any): string {
  const m = o.metadata || {}, a = o.shipping_address || {}, b = o.billing_address || {}
  const created = msk(o.created_at), date = created.slice(0, 10), time = created.slice(11, 19)
  const name = m.invoice_recipient || b.company || a.company || `${a.first_name || ""} ${a.last_name || ""}`.trim() || o.email
  const address = [a.postal_code, a.city, a.province, a.address_1].filter(Boolean).join(", ")
  const items = (o.items || []).map((it: any) => {
    const vm = it.variant?.metadata || {}
    const guid = vm.guid || it.variant_id
    const article = String(it.variant?.sku || "").split("-")[0] || ""
    return `<Товар>${el("Ид", guid)}${el("Артикул", article)}${el("Наименование", `${it.product_title || it.title} (${it.variant_title || ""})`)}` +
      `<БазоваяЕдиница Код="796" НаименованиеПолное="Штука" МеждународноеСокращение="PCE"><Пересчет><Единица>796</Единица><Коэффициент>1</Коэффициент></Пересчет></БазоваяЕдиница>` +
      `<ЗначенияРеквизитов>${req("ТипНоменклатуры", "Товар")}${req("Размер", vm.size)}${req("Цвет", vm.color)}</ЗначенияРеквизитов>` +
      `${el("ЦенаЗаЕдиницу", num(it.unit_price))}${el("Количество", num(it.quantity))}${el("Сумма", num(it.total ?? it.unit_price * it.quantity))}<Единица>796</Единица><Коэффициент>1</Коэффициент></Товар>`
  }).join("")
  const delivery = Number(o.shipping_total) > 0
    ? `<Товар><Ид>ORDER_DELIVERY</Ид><Наименование>Доставка заказа</Наименование><ЗначенияРеквизитов>${req("ТипНоменклатуры", "Услуга")}</ЗначенияРеквизитов>${el("ЦенаЗаЕдиницу", num(o.shipping_total))}<Количество>1</Количество>${el("Сумма", num(o.shipping_total))}</Товар>`
    : ""
  const contacts = `<Контакты>${o.email ? `<Контакт><Тип>Почта</Тип>${el("Значение", o.email)}</Контакт>` : ""}${(m.contact_phone || a.phone) ? `<Контакт><Тип>ТелефонРабочий</Тип>${el("Значение", m.contact_phone || a.phone)}</Контакт>` : ""}</Контакты>`
  return `<Документ>${el("Ид", o.id)}${el("Номер", o.display_id)}${el("Дата", date)}<ХозОперация>Заказ товара</ХозОперация><Роль>Продавец</Роль><Валюта>руб</Валюта><Курс>1</Курс>${el("Сумма", num(o.total))}` +
    `<Контрагенты><Контрагент>${el("Ид", o.customer_id || o.email)}${el("Наименование", name)}${el("ПолноеНаименование", name)}<Роль>Покупатель</Роль>${el("ИНН", m.cost_center)}${el("КПП", m.kpp)}` +
    `${m.legal_address ? `<ЮридическийАдрес>${el("Представление", m.legal_address)}</ЮридическийАдрес>` : ""}${address ? `<АдресРегистрации>${el("Представление", address)}</АдресРегистрации>` : ""}${contacts}</Контрагент></Контрагенты>` +
    `${el("Время", time)}<Товары>${items}${delivery}</Товары>` +
    `<ЗначенияРеквизитов>${req("Статус заказа", ORDER_STATUS_RU[o.status] || o.status)}${req("Метод оплаты", "Счёт на оплату")}${req("Заказ оплачен", o.payment_status === "captured" ? "true" : "false")}${req("Отменен", o.status === "canceled" ? "true" : "false")}` +
    `${req("Способ доставки", (o.shipping_methods || []).map((s: any) => s.name).join(", "))}${req("Адрес доставки", address)}${req("Получатель", [a.company, a.first_name, a.last_name].filter(Boolean).join(" "))}${req("Телефон получателя", a.phone)}` +
    `${req("Комментарий", [m.notes, m.door_code && `Отметка на грузе: ${m.door_code}`, m.requisition_number && `Заявка покупателя: ${m.requisition_number}`].filter(Boolean).join(". "))}${req("Email", o.email)}${req("Сайт", "new")}</ЗначенияРеквизитов></Документ>`
}

export const ordersXml = (docs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<КоммерческаяИнформация ВерсияСхемы="2.05" ДатаФормирования="${new Date().toISOString().slice(0, 19)}">${docs.join("\n")}</КоммерческаяИнформация>`

/** Разбор ответа 1С по заказам (sale/file): Номер + «Номер по 1С», «Статус заказа», «Проведен» */
export function parseOrderStatuses(xml: string): { number: string; onec_number?: string; status?: string; posted?: string }[] {
  const out: { number: string; onec_number?: string; status?: string; posted?: string }[] = []
  for (const m of xml.matchAll(/<Документ>([\s\S]*?)<\/Документ>/g)) {
    const b = m[1]
    const tag = (n: string) => (b.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`)) || [])[1]?.trim()
    const rq = (n: string) => (b.match(new RegExp(`<Наименование>${n}</Наименование>\\s*<Значение>([\\s\\S]*?)</Значение>`)) || [])[1]?.trim()
    const number = tag("Номер"); if (!number) continue
    out.push({ number, onec_number: rq("Номер по 1С"), status: rq("Статус заказа"), posted: rq("Проведен") })
  }
  return out
}
