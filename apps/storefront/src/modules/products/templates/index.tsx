import { HttpTypes } from "@medusajs/types"
import ImageGallery from "@/modules/products/components/image-gallery"
import ProductActions from "@/modules/products/components/product-actions"
import ProductTabs from "@/modules/products/components/product-tabs"
import RelatedProducts from "@/modules/products/components/related-products"
import ProductInfo from "@/modules/products/templates/product-info"
import SkeletonRelatedProducts from "@/modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import React, { Suspense } from "react"
import ProductActionsWrapper from "./product-actions-wrapper"
import ProductFacts from "../components/product-facts"
import EcDetail from "@/modules/analytics/ec-detail"
import ProductAlternatives from "@/modules/products/components/product-alternatives"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product, region, countryCode }) => {
  if (!product || !product.id) return notFound()

  return (
    <div className="bg-oh-paper/60">
      <div className="content-container flex flex-col gap-4 py-6">
        <EcDetail product={product} />
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" data-testid="product-container">
          <div className="flex flex-col gap-4">
            <ImageGallery product={product} />
            <Suspense fallback={null}>
              <ProductAlternatives productId={product.id} currentColor={String((product.metadata as any)?.color_label || "") || undefined} />
            </Suspense>
          </div>
          <div className="flex w-full flex-col gap-5">
            <ProductInfo product={product} />
            <Suspense fallback={<ProductActions product={product} region={region} />}>
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
            <ProductFacts product={product} />
          </div>
        </div>
        <ProductTabs product={product} />
        <div data-testid="related-products-container">
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts product={product} countryCode={countryCode} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default ProductTemplate
