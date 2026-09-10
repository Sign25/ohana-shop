import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"
import { acceptFile, authorize, COOKIE_NAME, log, orderToXml, ordersXml, parseOrderStatuses, runPipeline, safePath, syncImages } from "../../lib/onec-exchange"

/**
 * /commerceml?type=catalog|sale&mode=… — точка обмена для узла «ОбменССайтом» 1С (формат как у CS-Cart, чтобы
 * в 1С поменять только адрес/логин/пароль узла). Тело запросов не парсится (bodyParser: false в middlewares.ts).
 */
const ORDER_FIELDS = ["id", "display_id", "created_at", "email", "currency_code", "status", "payment_status", "customer_id", "total", "subtotal", "shipping_total", "metadata",
  "items.title", "items.product_title", "items.variant_title", "items.variant_id", "items.quantity", "items.unit_price", "items.total", "items.variant.sku", "items.variant.metadata",
  "shipping_address.*", "billing_address.*", "shipping_methods.name"]

const readBody = (req: MedusaRequest): Promise<Buffer> => new Promise((resolve, reject) => {
  if ((req as any).rawBody) return resolve(Buffer.from((req as any).rawBody))
  const chunks: Buffer[] = []
  req.on("data", (c: Buffer) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks))); req.on("error", reject)
})
const text = (res: MedusaResponse, body: string, status = 200) => { res.status(status).setHeader("Content-Type", "text/plain; charset=utf-8"); res.send(body) }

async function handle(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, any>
  const type = String(q.type || ""), mode = String(q.mode || ""), filename = String(q.filename || "")
  const auth = authorize(req.headers as any, q)
  if (!auth.ok) { log(`${type}/${mode}: отказ в доступе (${req.headers["x-forwarded-for"] || req.socket?.remoteAddress})`); return text(res, "failure\nauth", 401) }

  if (mode === "checkauth") {
    log(`${type}/checkauth: ок`)
    return text(res, `success\n${COOKIE_NAME}\n${auth.sessid}\nsessid=${auth.sessid}\nversion=3.1`)
  }
  if (mode === "init") {
    if (type === "catalog") { const inbox = safePath("x")!; fs.rmSync(path.dirname(inbox), { recursive: true, force: true }); fs.mkdirSync(path.dirname(inbox), { recursive: true }) }
    log(`${type}/init`)
    return text(res, "zip=no\nfile_limit=52428800")
  }
  if (mode === "file") {
    const body = await readBody(req)
    if (type === "catalog") {
      const p = safePath(filename); if (!p) return text(res, "failure\nbad filename")
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.appendFileSync(p, body) // большой файл 1С шлёт частями с одним именем
      log(`catalog/file ${filename} +${body.length} байт`)
      return text(res, "success")
    }
    // sale/file — 1С возвращает статусы заказов
    const statuses = parseOrderStatuses(body.toString("utf8"))
    const orderService = req.scope.resolve(Modules.ORDER) as any
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    for (const s of statuses) {
      const { data } = await query.graph({ entity: "order", fields: ["id", "metadata"], filters: { display_id: Number(s.number) } as any })
      const o = data[0]; if (!o) continue
      await orderService.updateOrders([{ id: o.id, metadata: { ...(o.metadata || {}), onec_number: s.onec_number, onec_status: s.status, onec_posted: s.posted, onec_status_at: new Date().toISOString() } }])
    }
    log(`sale/file: статусов ${statuses.length}`)
    return text(res, "success")
  }
  if (mode === "import" && type === "catalog") {
    const kind = acceptFile(filename)
    if (!kind) return text(res, "failure\nno such file")
    log(`catalog/import ${filename}`)
    if (/^offers/i.test(path.basename(filename))) { const n = syncImages(); log(`картинок перенесено: ${n}`); runPipeline(`после ${filename}`) }
    return text(res, "success")
  }
  if (type === "sale" && mode === "query") {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", fields: ORDER_FIELDS, pagination: { take: 200, order: { created_at: "ASC" } } })
    const fresh = data.filter((o: any) => !o.metadata?.onec_exported_at)
    const xml = ordersXml(fresh.map(orderToXml))
    fs.writeFileSync(path.join(path.dirname(safePath("x")!), "..", "orders_last.xml"), xml)
    ;(global as any).__onecPending = fresh.map((o: any) => ({ id: o.id, metadata: o.metadata }))
    log(`sale/query: заказов ${fresh.length}`)
    res.status(200).setHeader("Content-Type", "text/xml; charset=utf-8"); return res.send("﻿" + xml)
  }
  if (type === "sale" && mode === "success") {
    const pending = ((global as any).__onecPending || []) as { id: string; metadata: any }[]
    const orderService = req.scope.resolve(Modules.ORDER) as any
    const at = new Date().toISOString()
    for (const o of pending) await orderService.updateOrders([{ id: o.id, metadata: { ...(o.metadata || {}), onec_exported_at: at } }])
    ;(global as any).__onecPending = []
    log(`sale/success: отмечено ${pending.length}`)
    return text(res, "success")
  }
  if (type === "sale" && mode === "import") return text(res, "success")
  log(`неизвестный режим ${type}/${mode}`)
  return text(res, "failure\nunknown mode")
}

export const GET = handle
export const POST = handle
