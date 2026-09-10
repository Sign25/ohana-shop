/**
 * Мост к 1С:КА2 через MCP (Streamable HTTP, JSON-RPC). Конфиг — /etc/ohana/1c_mcp.conf
 * (строка `url = https://…`, файл root:ohana 0640; URL содержит токен — не логировать).
 * Повторяет логику /usr/local/sbin/ohana_stock_sync.php со старого сайта.
 */
import * as fs from "fs"

const CONF = process.env.OHANA_1C_MCP_CONF || "/etc/ohana/1c_mcp.conf"

export function mcpUrl(): string {
  const txt = fs.existsSync(CONF) ? fs.readFileSync(CONF, "utf8") : ""
  const m = txt.match(/^\s*url\s*=\s*(\S+)/m)
  if (!m) throw new Error(`нет url в ${CONF}`)
  return m[1]
}

async function post(url: string, body: any, sid?: string): Promise<{ status: number; text: string; sid?: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }
  if (sid) headers["Mcp-Session-Id"] = sid
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) })
  const text = await res.text()
  return { status: res.status, text, sid: res.headers.get("mcp-session-id") || undefined }
}

export class OnecMcp {
  private url = mcpUrl()
  private sid?: string
  private id = 1

  private async init() {
    const r = await post(this.url, {
      jsonrpc: "2.0", id: this.id++, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ohana-shop-sync", version: "1.0" } },
    })
    if (r.status < 200 || r.status >= 300 || !r.sid) throw new Error(`MCP: инициализация не удалась (HTTP ${r.status})`)
    this.sid = r.sid
    await post(this.url, { jsonrpc: "2.0", method: "notifications/initialized" }, this.sid)
  }

  /** Выполнить запрос 1С; вернуть строки (с полями *__id при withIds) */
  async query(query: string, withIds = true, maxRows = 30000): Promise<Record<string, any>[]> {
    if (!this.sid) await this.init()
    const r = await post(this.url, {
      jsonrpc: "2.0", id: this.id++, method: "tools/call",
      params: { name: "run_query", arguments: { query, withIds, maxRows } },
    }, this.sid)
    if (r.status < 200 || r.status >= 300) throw new Error(`MCP: запрос отклонён (HTTP ${r.status})`)
    // ответ SSE: строки "data: {...}"
    const json = r.text.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).join("") || r.text
    const env = JSON.parse(json.trim())
    const inner = env?.result?.content?.[0]?.text || ""
    if (!inner) throw new Error("MCP: пустой ответ")
    const data = JSON.parse(inner)
    if (!data.rows) throw new Error("1С вернула ошибку: " + inner.slice(0, 200))
    if (data.truncated) throw new Error("ответ 1С обрезан по лимиту строк")
    return data.rows
  }
}

export const ZERO_GUID = "00000000-0000-0000-0000-000000000000"

/** Группы номенклатуры, которые попадают на сайт (как в обмене узлов 005/007) */
export const SITE_GROUPS_SQL = ' (Г.Наименование = "Сайт ОПТ+РОЗН" ИЛИ Г.Наименование = "Номенклатура 2026")'

/** Номенклатура, попадающая на сайт: для неё отсутствие строки остатка означает 0 */
export const Q_SCOPE =
  "ВЫБРАТЬ Г.Ссылка КАК Гр ПОМЕСТИТЬ ГрТ ИЗ Справочник.Номенклатура КАК Г ГДЕ Г.ЭтоГруппа И" + SITE_GROUPS_SQL +
  " ; ВЫБРАТЬ Н.Ссылка КАК Ном ИЗ Справочник.Номенклатура КАК Н ГДЕ НЕ Н.ЭтоГруппа И НЕ Н.ПометкаУдаления И Н.Ссылка В ИЕРАРХИИ (ВЫБРАТЬ Т.Гр ИЗ ГрТ КАК Т)"

export const Q_STOCK =
  "ВЫБРАТЬ Г.Ссылка КАК Гр ПОМЕСТИТЬ ГрТ ИЗ Справочник.Номенклатура КАК Г ГДЕ Г.ЭтоГруппа И" + SITE_GROUPS_SQL +
  " ; ВЫБРАТЬ Н.Ссылка КАК Ном ПОМЕСТИТЬ НТ ИЗ Справочник.Номенклатура КАК Н ГДЕ НЕ Н.ЭтоГруппа И Н.Ссылка В ИЕРАРХИИ (ВЫБРАТЬ Т.Гр ИЗ ГрТ КАК Т)" +
  " ; ВЫБРАТЬ З.Номенклатура КАК Ном, З.Характеристика КАК Хар, СУММА(З.ВНаличииОстаток) КАК Кол" +
  " ИЗ РегистрНакопления.ЗапасыИПотребности.Остатки(, Номенклатура В (ВЫБРАТЬ Т.Ном ИЗ НТ КАК Т)) КАК З" +
  " СГРУППИРОВАТЬ ПО З.Номенклатура, З.Характеристика"
