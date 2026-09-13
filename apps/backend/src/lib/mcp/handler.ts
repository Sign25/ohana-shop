import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ADMIN_TOOLS, CATALOG, PROTOCOL_VERSION, authLevel, clientIp, conf, ipAllowed, logline, runTool } from "./server"

/** Общий обработчик /mcp и /mcp/:token (GET — проверка, POST — JSON-RPC) */
export async function mcpGet(req: MedusaRequest, res: MedusaResponse) {
  res.json({ status: "ok", service: "ohana-mcp", store: conf().store || "newshop", transport: "streamable-http" })
}
export async function mcpPost(req: MedusaRequest, res: MedusaResponse, pathToken?: string) {
  const send = (payload: any, code = 200) => { res.status(code); res.setHeader("Cache-Control", "no-store"); res.json(payload) }
  if (!ipAllowed(req)) { logline(`DENY ip=${clientIp(req)}`); return send({ error: "forbidden" }, 403) }
  const level = authLevel(req, pathToken)
  if (!level) { res.setHeader("WWW-Authenticate", 'Bearer realm="ohana-mcp"'); logline(`DENY auth ip=${clientIp(req)}`); return send({ error: "unauthorized" }, 401) }
  const body: any = req.body || {}
  const id = body.id ?? null, method = String(body.method || ""), params = body.params || {}
  const t0 = Date.now()
  switch (method) {
    case "initialize":
      return send({ jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: `ohana-${conf().store || "newshop"}`, version: "1.0.0" }, instructions: `Новый магазин Ohana на Medusa (${conf().store_url || ""}). Начни с orientation, затем kb_get name=ops (OPS.md). База знаний — kb_list / kb_search / kb_get.` } })
    case "notifications/initialized":
    case "notifications/cancelled":
      res.status(202); return res.end()
    case "ping":
      return send({ jsonrpc: "2.0", id, result: {} })
    case "tools/list":
      return send({ jsonrpc: "2.0", id, result: { tools: level === "admin" ? CATALOG : CATALOG.filter((t) => !ADMIN_TOOLS.includes(t.name)) } })
    case "tools/call": {
      const name = String(params.name || "")
      if (!CATALOG.some((t) => t.name === name)) return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Неизвестный инструмент: ${name}` } })
      if (ADMIN_TOOLS.includes(name) && level !== "admin") return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Инструмент ${name} требует токен уровня admin.` }], isError: true } })
      try {
        const text = await Promise.race([
          runTool(name, params.arguments, { pg: req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION), query: req.scope.resolve(ContainerRegistrationKeys.QUERY), level }),
          new Promise<string>((_, rej) => setTimeout(() => rej(new Error("инструмент не уложился в 300 с")), 300000)),
        ])
        logline(`CALL ${name} level=${level} ip=${clientIp(req)} ${Date.now() - t0}ms ok`)
        return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } })
      } catch (e: any) {
        logline(`CALL ${name} level=${level} ip=${clientIp(req)} ${Date.now() - t0}ms fail`)
        return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Ошибка: ${e?.message || e}` }], isError: true } })
      }
    }
    default:
      return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } })
  }
}
