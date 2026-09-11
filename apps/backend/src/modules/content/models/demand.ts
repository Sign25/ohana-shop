import { model } from "@medusajs/framework/utils"

/** Заявка «Мне это нужно» на распроданный товар: копится для закупки и уведомления о поступлении */
export const Demand = model.define("ohana_demand", {
  id: model.id({ prefix: "dmd" }).primaryKey(),
  product_id: model.text(),
  email: model.text(),
  customer_id: model.text().nullable(),
  ip: model.text().nullable(),
  notified_at: model.dateTime().nullable(),
}).indexes([{ on: ["product_id"] }, { on: ["product_id", "email"], unique: true }])
