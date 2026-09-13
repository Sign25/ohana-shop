import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mcpGet, mcpPost } from "../../lib/mcp/handler"

/** MCP-сервер нового магазина: GET — проверка, POST — JSON-RPC (Bearer-токен) */
export const GET = (req: MedusaRequest, res: MedusaResponse) => mcpGet(req, res)
export const POST = (req: MedusaRequest, res: MedusaResponse) => mcpPost(req, res)
