import { model } from "@medusajs/framework/utils"

/** Рейтинг товара на Wildberries (по артикулу): сводка из отзывов покупателей WB */
export const WbRating = model.define("ohana_wb_rating", {
  id: model.id({ prefix: "wbr" }).primaryKey(),
  product_code: model.text(),
  nm_id: model.bigNumber().default(0),
  rating: model.float().default(0),
  reviews_count: model.number().default(0),
  text_count: model.number().default(0),
  synced_at: model.dateTime().nullable(),
}).indexes([{ on: ["product_code"], unique: true }])

/** Текст отзыва Wildberries (feedback_id уникален у WB) */
export const WbReview = model.define("ohana_wb_review", {
  id: model.id({ prefix: "wbf" }).primaryKey(),
  feedback_id: model.text(),
  product_code: model.text(),
  nm_id: model.bigNumber().default(0),
  valuation: model.number().default(0),
  author: model.text().default(""),
  body: model.text().default(""),
  created_date: model.text().default(""),
}).indexes([{ on: ["feedback_id"], unique: true }, { on: ["product_code", "created_date"] }])
