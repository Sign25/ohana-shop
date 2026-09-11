import FeaturedProducts from "@/modules/home/components/featured-products"
import Hero from "@/modules/home/components/hero"
import Marketplaces from "@/modules/home/components/marketplaces"
import SkeletonFeaturedProducts from "@/modules/skeletons/templates/skeleton-featured-products"
import { Metadata } from "next"
import { Suspense } from "react"

// ISR: страница пересобирается не реже раза в 60 с — остатки и цены приходят из 1С, без этого они замирали на моменте сборки
export const revalidate = 60

export const metadata: Metadata = {
  title: "Ohana Market — одежда и домашний текстиль оптом от производителя",
  description:
    "Оптовый интернет-магазин Ohana Market: трикотаж, домашняя одежда, детская одежда и текстиль напрямую от производителя из Омска.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  return (
    <div className="flex flex-col">
      <Hero />
      <Suspense fallback={<SkeletonFeaturedProducts />}>
        <FeaturedProducts countryCode={countryCode} />
      </Suspense>
      <Marketplaces />
    </div>
  )
}
