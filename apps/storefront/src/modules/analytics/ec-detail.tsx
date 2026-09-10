"use client"

import { ecDetail } from "@/lib/util/metrika"
import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"

/** ecommerce «detail» при открытии карточки товара */
const EcDetail = ({ product }: { product: HttpTypes.StoreProduct }) => {
  useEffect(() => {
    const prices = (product.variants || []).map((v: any) => Number(v.calculated_price?.calculated_amount)).filter((n) => n > 0)
    ecDetail({ id: product.id, name: product.title, price: prices.length ? Math.min(...prices) : undefined, category: product.categories?.[0]?.name })
  }, [product.id])
  return null
}

export default EcDetail
