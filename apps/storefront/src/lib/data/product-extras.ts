"use server"

import { sdk } from "@/lib/config"
import { getAuthHeaders } from "./cookies"

/** «Другие расцветки» — товары той же группы альтернатив из 1С (product.metadata.alt_group) */
export type AltProduct = { id: string; handle: string; title: string; thumbnail: string | null; color: string | null; code: string | null; in_stock: boolean }
export const listAlternatives = async (productId: string): Promise<AltProduct[]> => {
  try {
    const { products } = await sdk.client.fetch<{ products: AltProduct[] }>(`/store/ohana/alternatives`, { method: "GET", query: { product_id: productId }, next: { revalidate: 120 } })
    return products
  } catch { return [] }
}

/** «Мне это нужно»: сколько уже ждут и запись заявки */
export const getDemandCount = async (productId: string): Promise<number> => {
  try {
    const { count } = await sdk.client.fetch<{ count: number }>(`/store/ohana/demand`, { method: "GET", query: { product_id: productId }, cache: "no-store" })
    return count
  } catch { return 0 }
}
export const submitDemand = async (productId: string, email: string): Promise<{ ok: boolean; message: string; count?: number }> => {
  try {
    const r = await sdk.client.fetch<{ ok: boolean; message: string; count: number }>(`/store/ohana/demand`, { method: "POST", body: { product_id: productId, email }, headers: { ...(await getAuthHeaders()) } })
    return r
  } catch (e: any) {
    return { ok: false, message: e?.message || "Не получилось записать заявку — попробуйте ещё раз." }
  }
}

/** «Заказать звонок» → лид в Битрикс24 (маршрут /store/ohana/callback) */
export const requestCallback = async (data: { name: string; phone: string; comment?: string; page?: string }): Promise<{ ok: boolean; message: string }> => {
  try {
    return await sdk.client.fetch<{ ok: boolean; message: string }>(`/store/ohana/callback`, { method: "POST", body: data })
  } catch (e: any) { return { ok: false, message: e?.message || "Не получилось отправить — позвоните нам: 8 (991) 430-17-30." } }
}

/** Куда вести с адреса скрытого товара (draft / без фото): раздел каталога или /store */
export const getGoneRedirect = async (handle: string): Promise<string | null> => {
  try {
    const r = await sdk.client.fetch<{ exists: boolean; hidden?: boolean; redirect: string | null }>(`/store/ohana/gone`, { method: "GET", query: { handle }, cache: "no-store" })
    return r.exists ? r.redirect : null
  } catch { return null }
}
