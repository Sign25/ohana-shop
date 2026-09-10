"use client"

import { METRIKA_ID } from "@/lib/util/metrika"
import { usePathname, useSearchParams } from "next/navigation"
import Script from "next/script"
import { useEffect, useRef } from "react"

/**
 * Счётчик Яндекс.Метрики: подключается только при NEXT_PUBLIC_METRIKA_ID (на стенде выключен).
 * SPA-переходы отправляются как hit; ecommerce — через dataLayer (см. lib/util/metrika.ts).
 */
const Metrika = () => {
  const pathname = usePathname()
  const search = useSearchParams()
  const first = useRef(true)

  useEffect(() => {
    if (!METRIKA_ID) return
    if (first.current) { first.current = false; return } // первый показ считает сам тег
    if (typeof window.ym === "function") window.ym(Number(METRIKA_ID), "hit", window.location.href)
  }, [pathname, search])

  if (!METRIKA_ID) return null
  return (
    <>
      <Script id="ym-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
        for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
        ym(${Number(METRIKA_ID)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,ecommerce:"dataLayer"});
      `}</Script>
      <noscript>
        <div><img src={`https://mc.yandex.ru/watch/${Number(METRIKA_ID)}`} style={{ position: "absolute", left: "-9999px" }} alt="" /></div>
      </noscript>
    </>
  )
}

export default Metrika
