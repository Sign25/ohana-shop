"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import ProductBadges from "@/modules/products/components/product-badges"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"

/** Галерея: большое фото 3:4 на белом, ряд миниатюр, стрелки и клавиши ←/→ */
const ImageGallery = ({ product, hit }: { product: HttpTypes.StoreProduct; hit?: boolean }) => {
  const images = useMemo(
    () => (product?.images?.length ? product.images : product?.thumbnail ? [{ id: "thumb", url: product.thumbnail }] : []),
    [product]
  )
  const [idx, setIdx] = useState(0)
  const go = useCallback((d: number) => setIdx((i) => Math.min(images.length - 1, Math.max(0, i + d))), [images.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement) return
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  const cur = images[idx]

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-oh-line bg-white">
        <ProductBadges product={product} size="lg" hit={hit} />
        {cur?.url && (
          <Image
            src={cur.url}
            priority
            className="object-contain"
            alt={(cur as any).metadata?.alt || product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-oh-line bg-white/90 p-2 text-oh-graphite hover:text-oh-azure disabled:opacity-30">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" onClick={() => go(1)} disabled={idx === images.length - 1} aria-label="Следующее фото" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-oh-line bg-white/90 p-2 text-oh-graphite hover:text-oh-azure disabled:opacity-30">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((im, i) => (
            <li key={im.id}>
              <button type="button" onClick={() => setIdx(i)} className={clx("relative h-20 w-16 overflow-hidden rounded-lg border bg-white", i === idx ? "border-oh-azure" : "border-oh-line hover:border-oh-line-2")} aria-label={`Фото ${i + 1}`}>
                <Image src={im.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImageGallery
