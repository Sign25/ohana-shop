import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** POST /store/ohana/login-hint {email} — есть ли аккаунт с такой почтой (подсказка при неверном входе, как на старом сайте) */
export const POST = async (req: MedusaRequest<any>, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const email = String((req.body as any)?.email || "").trim().toLowerCase()
  if (!email) return res.json({ exists: false })
  const { data } = await query.graph({ entity: "customer", fields: ["id", "has_account"], filters: { email } })
  res.json({ exists: data.some((c: any) => c.has_account) })
}
