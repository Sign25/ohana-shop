import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mcpGet, mcpPost } from "../../../lib/mcp/handler"

/** Секрет в пути — для коннектора claude.ai, где заголовки задать негде */
export const GET = (req: MedusaRequest, res: MedusaResponse) => mcpGet(req, res)
export const POST = (req: MedusaRequest, res: MedusaResponse) => mcpPost(req, res, String(req.params.token || ""))
