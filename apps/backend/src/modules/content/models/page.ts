import { model } from "@medusajs/framework/utils"

/** Служебная страница витрины (/p/<slug>): HTML со своими стилями, редактируется в админке «Страницы» */
export const Page = model.define("ohana_page", {
  id: model.id({ prefix: "page" }).primaryKey(),
  slug: model.text().unique(),
  title: model.text(),
  page_title: model.text().nullable(),
  meta: model.text().nullable(),
  html: model.text(),
  has_h1: model.boolean().default(false),
  status: model.enum(["published", "draft"]).default("published"),
  sort: model.number().default(0),
})
