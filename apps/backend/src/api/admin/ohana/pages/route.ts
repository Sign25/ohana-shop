import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CONTENT_MODULE } from "../../../../modules/content"

const SLUG = /^[a-z0-9-]{1,80}$/

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const pages = await svc.listPages({}, { order: { sort: "ASC", title: "ASC" } })
  res.json({ pages })
}

export const POST = async (req: AuthenticatedMedusaRequest<any>, res: MedusaResponse) => {
  const svc = req.scope.resolve(CONTENT_MODULE) as any
  const b = req.body || {}
  if (!SLUG.test(String(b.slug || ""))) return res.status(400).json({ message: "Адрес страницы (slug): латиница, цифры и дефис" })
  if (!String(b.title || "").trim()) return res.status(400).json({ message: "Укажите название" })
  const [page] = await svc.createPages([{ slug: b.slug, title: b.title, page_title: b.page_title || null, meta: b.meta || null, html: String(b.html || ""), has_h1: !!b.has_h1, status: b.status === "draft" ? "draft" : "published", sort: Number(b.sort) || 0 }])
  res.json({ page })
}
