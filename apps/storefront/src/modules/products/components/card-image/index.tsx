"use client"

import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useState } from "react"

/**
 * Фото в карточке каталога. Одежда снята 3:4 и заполняет блок целиком; для «широких» фото
 * (соки, текстиль) после загрузки блок становится 4:3, чтобы не резать и не оставлять пустоту.
 * При наведении — лёгкий зум и, если есть, второе фото (вид сзади / деталь).
 */
const CardImage = ({ src, alt, hoverSrc }: { src: string; alt: string; hoverSrc?: string | null }) => {
  const [wide, setWide] = useState(false)
  return (
    <div className={clx("relative w-full bg-white", wide ? "aspect-[4/3]" : "aspect-[3/4]")}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 512px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className={clx("object-cover object-center transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]", hoverSrc && "group-hover:opacity-0")}
        draggable={false}
        onLoad={(e) => {
          const im = e.currentTarget
          if (im.naturalWidth && im.naturalHeight && im.naturalWidth / im.naturalHeight > 1.05) setWide(true)
        }}
      />
      {hoverSrc && (
        <Image src={hoverSrc} alt="" fill sizes="(max-width: 512px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover object-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" draggable={false} aria-hidden />
      )}
    </div>
  )
}

export default CardImage
