import { PARTNERS } from "@/lib/util/home-content"

/** «Нам доверяют» — бегущая строка логотипов партнёров (CSS-анимация, без JS) */
const Partners = () => (
  <div className="content-container py-4">
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="oh-h text-[26px]">Нам доверяют</h2>
      <span className="text-[13px] text-oh-graphite">сети, маркетплейсы и оптовые покупатели по всей России</span>
    </div>
    <div className="relative overflow-hidden rounded-card border border-oh-line bg-white py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <ul className="flex w-max animate-[oh-marquee_40s_linear_infinite] items-center gap-10 motion-reduce:animate-none">
        {[...PARTNERS, ...PARTNERS].map((src, i) => (
          <li key={i} className="shrink-0">
            <img src={src} alt="Партнёр Ohana Market" loading="lazy" className="h-10 w-auto opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" />
          </li>
        ))}
      </ul>
    </div>
  </div>
)

export default Partners
