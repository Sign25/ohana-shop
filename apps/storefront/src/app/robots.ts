import type { MetadataRoute } from "next"

/** До запуска витрина живёт на new.ohanaopt.ru и закрыта от индексации (NEXT_PUBLIC_NOINDEX=1). */
export default function robots(): MetadataRoute.Robots {
  const noindex = process.env.NEXT_PUBLIC_NOINDEX === "1"
  return noindex
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/", disallow: ["/ru/cart", "/ru/checkout", "/ru/account"] }, sitemap: `${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml` }
}
