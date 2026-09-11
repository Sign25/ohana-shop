import { sdk } from "@/lib/config"
import pages from "@/content/pages.json"

/** Служебные страницы и баннеры из админки (модуль content); pages.json — запасной вариант, если API недоступен */
export type ContentPage = { slug: string; title: string; page_title?: string | null; meta?: string | null; html: string; has_h1: boolean }
export type Banner = { id: string; title: string; image_url: string; mobile_image_url?: string | null; link?: string | null; alt?: string | null }

const FALLBACK = pages as Record<string, Omit<ContentPage, "slug">>

export const getPage = async (slug: string): Promise<ContentPage | null> => {
  try {
    const { page } = await sdk.client.fetch<{ page: ContentPage }>(`/store/ohana/pages/${encodeURIComponent(slug)}`, { method: "GET", next: { revalidate: 60 } })
    if (page) return page
  } catch {}
  const f = FALLBACK[slug]
  return f ? { slug, ...f } : null
}

export const listPages = async (): Promise<{ slug: string; title: string }[]> => {
  try {
    const { pages: list } = await sdk.client.fetch<{ pages: { slug: string; title: string }[] }>(`/store/ohana/pages`, { method: "GET", next: { revalidate: 300 } })
    return list
  } catch { return Object.entries(FALLBACK).map(([slug, p]) => ({ slug, title: p.title })) }
}

export const listBanners = async (place = "hero"): Promise<Banner[]> => {
  try {
    const { banners } = await sdk.client.fetch<{ banners: Banner[] }>(`/store/ohana/banners`, { method: "GET", query: { place }, next: { revalidate: 60 } })
    return banners
  } catch { return [] }
}
