"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

export type HeroBanner = { href: string; src: string; w: number; h: number; alt: string }

/** Карусель hero-баннеров: один баннер в кадре, автопрокрутка 6 с, точки, стрелки, свайп; пауза при наведении */
const HeroCarousel = ({ banners }: { banners: HeroBanner[] }) => {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef<number | null>(null)
  const n = banners.length
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n])
  useEffect(() => {
    if (n < 2 || paused) return
    const t = setInterval(() => go(1), 6000)
    return () => clearInterval(t)
  }, [n, paused, go])
  if (!n) return null
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-oh-paper" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)} onTouchEnd={(e) => { if (touch.current !== null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) } touch.current = null }}>
      <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, k) => (
          <LocalizedClientLink key={`${b.href}-${k}`} href={b.href} className="block w-full shrink-0" aria-hidden={k !== i} tabIndex={k === i ? 0 : -1}>
            <Image src={b.src} alt={b.alt} width={b.w} height={b.h} priority={k === 0} sizes="(max-width: 1440px) 100vw, 1440px" className="aspect-[1920/560] h-auto w-full object-cover" />
          </LocalizedClientLink>
        ))}
      </div>
      {n > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Предыдущий баннер" className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-oh-line bg-white/90 p-2 text-oh-graphite hover:text-oh-azure small:block">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Следующий баннер" className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-oh-line bg-white/90 p-2 text-oh-graphite hover:text-oh-azure small:block">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {banners.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`Баннер ${k + 1}`} className={clx("h-2 rounded-pill transition-all", k === i ? "w-6 bg-oh-primary" : "w-2 bg-white/80 hover:bg-white")} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default HeroCarousel
