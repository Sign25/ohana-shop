"use client"

import { CalcProduct, searchCalcProducts, spreadBySizes } from "@/lib/data/bizcalc"
import { addToCartBulk, retrieveCart } from "@/lib/data/cart"
import { KRUPNY_THRESHOLD, OPT_THRESHOLD } from "@/lib/util/ohana"
import { toast } from "@medusajs/ui"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * WebMCP: инструменты магазина для браузерных агентов (Chrome 146+, `document.modelContext`,
 * старое имя `navigator.modelContext` — алиас). Регистрируем через registerTool, а при старом API — provideContext.
 * Действия с деньгами (добавление в корзину) требуют confirm: true и показывают уведомление; оформление заказа
 * агенту не отдаём — только переход на страницу. Для отладки инструменты доступны как window.__ohanaTools.
 */
type Tool = { name: string; description: string; inputSchema: any; execute: (input: any) => Promise<any> }

const productOut = (p: CalcProduct, countryCode: string) => ({
  id: p.id, code: p.code, name: p.name, url: `/${countryCode}/products/${p.handle}`,
  price_opt: p.opt, price_krupny: p.krupny, rrc: p.rrc || null, pack_qty: p.step, in_stock_total: p.stock,
  sizes: p.variants.map((v) => ({ size: v.size, in_stock: v.stock })),
})

const WebMcp = () => {
  const router = useRouter()
  const params = useParams() as { countryCode?: string }
  const countryCode = params?.countryCode || "ru"

  useEffect(() => {
    const tools: Tool[] = [
      {
        name: "get_wholesale_terms",
        description: "Условия оптовых покупок Ohana Market: минимальный заказ, порог крупного опта, доставка, оплата.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({
          min_order_rub: OPT_THRESHOLD, krupny_opt_from_rub: KRUPNY_THRESHOLD,
          pricing: "Цены на сайте — оптовые за штуку, заказ кратно упаковке. При сумме корзины от порога крупного опта цены пересчитываются автоматически.",
          delivery: "Отгрузка со склада в Омске 24–48 часов после оплаты; до терминала ТК в Омске бесплатно, дальше по тарифу ТК; самовывоз.",
          payment: "Счёт для юрлица/ИП (безналичный расчёт).",
          contacts: { phone: "+7 991 430-17-30", hours: "пн–пт 10:00–18:00 (Омск, МСК+3)" },
        }),
      },
      {
        name: "search_products",
        description: "Поиск товаров в каталоге по названию или артикулу. Возвращает до 10 товаров в наличии с оптовыми ценами и размерами.",
        inputSchema: { type: "object", properties: { query: { type: "string", description: "Название или артикул, например «халат» или «15100»" } }, required: ["query"] },
        execute: async ({ query }: { query: string }) => (await searchCalcProducts(String(query || ""))).map((p) => productOut(p, countryCode)),
      },
      {
        name: "get_cart",
        description: "Содержимое корзины покупателя: позиции, количество, сумма и до какого порога опта не хватает.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const cart = await retrieveCart()
          if (!cart) return { items: [], total: 0, min_order_rub: OPT_THRESHOLD }
          const total = Number(cart.item_subtotal ?? cart.total ?? 0)
          return {
            items: (cart.items || []).map((i: any) => ({ product: i.product_title, size: i.variant_title, quantity: i.quantity, unit_price: i.unit_price, total: i.total })),
            total, min_order_rub: OPT_THRESHOLD, krupny_opt_from_rub: KRUPNY_THRESHOLD,
            to_min_order: Math.max(0, OPT_THRESHOLD - total), to_krupny: Math.max(0, KRUPNY_THRESHOLD - total),
            cart_url: `/${countryCode}/cart`,
          }
        },
      },
      {
        name: "add_to_cart",
        description: "Добавить товар в корзину по артикулу или id. Без size количество раскладывается по размерам в наличии поровну, кратно упаковке. Требует confirm: true — покупатель должен подтвердить действие.",
        inputSchema: {
          type: "object",
          properties: {
            product: { type: "string", description: "Артикул (code) или id товара из search_products" },
            quantity: { type: "integer", description: "Сколько штук всего (кратно упаковке)" },
            size: { type: "string", description: "Конкретный размер (как в search_products), необязательно" },
            confirm: { type: "boolean", description: "Подтверждение покупателя" },
          },
          required: ["product", "quantity", "confirm"],
        },
        execute: async ({ product, quantity, size, confirm }: { product: string; quantity: number; size?: string; confirm: boolean }) => {
          if (!confirm) return { ok: false, error: "Нужно подтверждение покупателя (confirm: true)" }
          const found = await searchCalcProducts(String(product))
          const p = found.find((x) => x.id === product || x.code === product) || found[0]
          if (!p) return { ok: false, error: "Товар не найден среди товаров в наличии" }
          let lineItems: { variant_id: string; quantity: number }[]
          if (size) {
            const v = p.variants.find((x) => x.size === size || x.size.split(" ")[0] === String(size))
            if (!v) return { ok: false, error: `Размера «${size}» нет в наличии`, sizes: p.variants.map((x) => x.size) }
            const step = Math.max(1, v.step), qty = Math.min(v.stock, Math.max(step, Math.round(Number(quantity) / step) * step))
            lineItems = [{ variant_id: v.id, quantity: qty }]
          } else lineItems = spreadBySizes(p, Number(quantity))
          if (!lineItems.length) return { ok: false, error: "Нечего добавить" }
          await addToCartBulk({ lineItems, countryCode })
          const added = lineItems.reduce((s, l) => s + l.quantity, 0)
          toast.success(`Агент добавил в корзину: ${p.name} — ${added} шт`)
          router.refresh()
          return { ok: true, product: p.name, added_qty: added, cart_url: `/${countryCode}/cart` }
        },
      },
      {
        name: "open_page",
        description: "Открыть страницу магазина: каталог (/store), товар (url из search_products), корзину (/cart), оформление (/checkout).",
        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
        execute: async ({ path }: { path: string }) => {
          const p = String(path || "/store")
          if (!p.startsWith("/")) return { ok: false, error: "Только относительные пути сайта" }
          router.push(p.startsWith(`/${countryCode}/`) || p === `/${countryCode}` ? p : `/${countryCode}${p}`)
          return { ok: true }
        },
      },
    ]
    ;(window as any).__ohanaTools = Object.fromEntries(tools.map((t) => [t.name, t.execute]))

    const ctx: any = (document as any).modelContext || (navigator as any).modelContext
    if (!ctx) return
    const registered: string[] = []
    try {
      if (typeof ctx.registerTool === "function") {
        for (const t of tools) { ctx.registerTool(t); registered.push(t.name) }
      } else if (typeof ctx.provideContext === "function") {
        ctx.provideContext({ tools })
      }
    } catch (e) {
      console.warn("WebMCP: не удалось зарегистрировать инструменты", e)
    }
    return () => {
      try { if (typeof ctx.unregisterTool === "function") registered.forEach((n) => ctx.unregisterTool(n)); else if (typeof ctx.clearContext === "function") ctx.clearContext() } catch {}
    }
  }, [countryCode])

  return null
}

export default WebMcp
