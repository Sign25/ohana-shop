"use client"

import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useState } from "react"

/**
 * Фото в карточке каталога. Одежда снята 3:4 и заполняет блок целиком; для «широких» фото
 * (соки, текстиль) после загрузки блок становится 4:3, чтобы не резать и не оставлять пустоту.
 */
const CardImage = ({ src, alt }: { src: string; alt: string }) => {
  const [wide, setWide] = useState(false)
  return (
    <div className={clx("relative w-full bg-white", wide ? "aspect-[4/3]" : "aspect-[3/4]")}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 512px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        draggable={false}
        onLoad={(e) => {
          const im = e.currentTarget
          if (im.naturalWidth && im.naturalHeight && im.naturalWidth / im.naturalHeight > 1.05) setWide(true)
        }}
      />
    </div>
  )
}

export default CardImage
