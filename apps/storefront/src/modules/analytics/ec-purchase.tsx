"use client"

import { ecFromLine, ecPurchase } from "@/lib/util/metrika"
import { useEffect } from "react"

/** ecommerce «purchase» на странице «заказ оформлен»; повторный показ страницы не дублируется (localStorage) */
const EcPurchase = ({ order }: { order: { id: string; display_id?: number; total?: number; items?: any[] } }) => {
  useEffect(() => {
    const key = `oh_ec_p_${order.id}`
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1") } catch {}
    ecPurchase(String(order.display_id ?? order.id), (order.items || []).map(ecFromLine), Number(order.total) || undefined)
  }, [order.id])
  return null
}

export default EcPurchase
