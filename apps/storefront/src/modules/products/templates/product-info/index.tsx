import { productSummary } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"

const ProductInfo = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const s = productSummary(product)
  return (
    <div id="product-info" className="flex w-full flex-col gap-2">
      {s.code && <div className="text-[12px] tracking-wide text-oh-muted">Артикул {s.code}</div>}
      <h1 className="text-[26px] font-semibold leading-tight text-oh-ink small:text-[30px]" data-testid="product-title">
        {product.title}
      </h1>
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
