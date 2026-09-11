import { IMG } from "@/lib/util/home-content"
import Image from "next/image"

/** SEO-блок главной (h1 + текст + семейное фото), как на старом сайте */
const SeoIntro = () => (
  <div className="content-container py-4">
    <section className="grid grid-cols-1 items-center gap-6 rounded-[20px] bg-oh-paper p-6 small:grid-cols-[3fr_2fr] small:p-8">
      <div>
        <h1 className="oh-h text-[26px] leading-tight small:text-[30px]">Одежда для всей семьи оптом от производителя — Ohana Market</h1>
        <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-oh-graphite">
          Оптовая продажа одежды для всей семьи: домашняя и спортивная одежда, трикотаж, детский ассортимент и домашний текстиль.
          Собственное контрактное производство, широкий размерный ряд, гибкие цены для мелкого и крупного опта, отгрузка из Омска по всей России —
          до терминала транспортной компании бесплатно.
        </p>
      </div>
      <Image src={`${IMG}/usp/seo_family.webp`} alt="Семья в одежде Ohana" width={820} height={656} sizes="(max-width: 1024px) 100vw, 40vw" className="h-auto w-full rounded-card" />
    </section>
  </div>
)

export default SeoIntro
