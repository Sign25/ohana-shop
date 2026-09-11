import { model } from "@medusajs/framework/utils"

/** Баннер витрины: место (hero — главная), картинка, ссылка, порядок, включён/выключен, срок показа */
export const Banner = model.define("ohana_banner", {
  id: model.id({ prefix: "bnr" }).primaryKey(),
  place: model.text().default("hero"),
  title: model.text(),
  image_url: model.text(),
  mobile_image_url: model.text().nullable(),
  link: model.text().nullable(),
  alt: model.text().nullable(),
  sort: model.number().default(0),
  active: model.boolean().default(true),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})
