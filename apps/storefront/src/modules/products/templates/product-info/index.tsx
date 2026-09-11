import { productSummary } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import { getWbProduct } from "@/lib/data/wb"
import WbRatingLine from "@/modules/products/components/wb-rating"

const ProductInfo = async ({ product }: { product: HttpTypes.StoreProduct }) => {
  const s = productSummary(product)
  const wb = s.code ? (await getWbProduct(s.code, 0, 0)).rating : null
  return (
    <div id="product-info" className="flex w-full flex-col gap-2">
      {s.code && <div className="text-[12px] tracking-wide text-oh-muted">Артикул {s.code}</div>}
      <h1 className="text-[26px] font-semibold leading-tight text-oh-ink small:text-[30px]" data-testid="product-title">
        {product.title}
      </h1>
      <WbRatingLine wb={wb} />
      {(s.sizeRange || s.composition) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-oh-graphite">
          {s.sizeRange && <span>Размеры {s.sizeRange}</span>}
          {s.composition && <span>{s.composition}</span>}
        </div>
      )}
    </div>
  )
}

export default ProductInfo
