/**
 * Разовый перенос служебных страниц из apps/storefront/src/content/pages.json и текущих баннеров главной
 * в модуль content (админка «Страницы»/«Баннеры»). Существующие slug не трогает.
 * Запуск: npx medusa exec ./src/scripts/seed-content.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import { CONTENT_MODULE } from "../modules/content"

const PAGES_JSON = "/srv/ohana/apps/shop/apps/storefront/src/content/pages.json"
const ORDER = ["about", "how-to-order", "conditions", "delivery", "payment", "return", "faq", "sertificat", "requisites", "contacts", "nagrady", "oferta", "privacy-policy", "vygruzka-tovarov-xml-dropshipping"]

export default async function seed({ container }: ExecArgs) {
  const svc = container.resolve(CONTENT_MODULE) as any
  const existing = new Set((await svc.listPages({}, { select: ["slug"] })).map((p: any) => p.slug))
  const pages = JSON.parse(fs.readFileSync(PAGES_JSON, "utf8")) as Record<string, any>
  const create = Object.entries(pages).filter(([slug]) => !existing.has(slug)).map(([slug, p]) => ({
    slug, title: p.title, page_title: p.page_title || null, meta: p.meta || null, html: p.html || "", has_h1: !!p.has_h1, status: "published", sort: (ORDER.indexOf(slug) + 1 || 99) * 10,
  }))
  if (create.length) await svc.createPages(create)
  console.log(`страниц добавлено: ${create.length}, было: ${existing.size}`)

  const banners = await svc.listBanners({}, { select: ["id"] })
  if (!banners.length) {
    await svc.createBanners([
      { place: "hero", title: "Осень/зима 2027 — семья", image_url: "https://api.ohanaopt.ru/images/ohana/hero/hero_autumn_family.jpg", link: "/categories/osen-zima-2027", alt: "Осень/зима 2027 — тёплая одежда для всей семьи", sort: 10, active: true },
      { place: "hero", title: "И в пир, и в мир", image_url: "https://api.ohanaopt.ru/images/ohana/hero/hero_pir_mir.jpg", link: "/categories/zhenskaya-odezhda", alt: "И в пир, и в мир, и в добрые люди — женская одежда", sort: 20, active: true },
    ])
    console.log("баннеров добавлено: 2")
  }
}
