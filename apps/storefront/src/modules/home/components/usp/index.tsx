import { USP } from "@/lib/util/home-content"
import Image from "next/image"

/** Четыре преимущества с предметными картинками (перенесены со старого сайта) */
const Usp = () => (
  <div className="content-container py-2">
    <ul className="grid grid-cols-1 gap-3 xsmall:grid-cols-2 small:grid-cols-4">
      {USP.map((u) => (
        <li key={u.title} className="relative flex min-h-[124px] overflow-hidden rounded-card border border-oh-line bg-oh-paper">
          <div className="z-[1] flex w-[62%] flex-col justify-center gap-1 p-4">
            <div className="text-[14px] font-semibold leading-tight text-oh-ink">{u.title}</div>
            <div className="text-[12px] leading-snug text-oh-graphite">{u.text}</div>
          </div>
          <Image src={u.img} alt="" width={320} height={260} className="absolute right-0 top-0 h-full w-[42%] object-cover object-left" sizes="(max-width: 1024px) 50vw, 25vw" />
        </li>
      ))}
    </ul>
  </div>
)

export default Usp
