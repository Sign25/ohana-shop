import { productSpecs } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import ProductTabsView from "./view"
import SizeChart from "@/modules/products/components/size-chart"
import WbReviews from "@/modules/products/components/wb-reviews"
import { getWbProduct } from "@/lib/data/wb"

/** Описание приходит из 1С HTML-ом; характеристики — из metadata товара (см. import-cscart.ts) */
const ProductTabs = async ({ product }: { product: HttpTypes.StoreProduct }) => {
  const specs = productSpecs(product)
  const code = String((product.metadata as any)?.code || "")
  const wb = code ? await getWbProduct(code, 0, 10) : { rating: null, reviews: [], distribution: {} }
  const cats = (product.categories || []) as any[]
  const kids = cats.some((c) => /девоч|мальчик|детск|malchik|devoch|detsk/i.test(`${c.name} ${c.handle}`)) || /^(9|1[0-4])\d\b/.test(String((product.metadata as any)?.size_range || ""))
  const clothing = !cats.some((c) => /продукт|напит|текстиль для дома|аксессуар/i.test(String(c.name)))
  const tabs = [
    { label: "Описание", component: <DescriptionTab html={product.description || ""} /> },
    { label: "Характеристики", component: <SpecsTab rows={specs} /> },
    ...(clothing ? [{ label: "Таблица размеров", component: <SizeChart kids={kids} /> }] : []),
    ...(wb.rating && wb.rating.count ? [{ label: `Отзывы (${wb.rating.count})`, component: <WbReviews code={code} rating={wb.rating} initial={wb.reviews} distribution={wb.distribution} /> }] : []),
  ]

  return <ProductTabsView tabs={tabs} />
}

const DescriptionTab = ({ html }: { html: string }) => {
  if (!html.trim()) return <p className="py-6 text-sm text-oh-muted">Описание появится после обновления из 1С.</p>
  const looksHtml = /<[a-z][\s\S]*>/i.test(html)
  return looksHtml ? (
    <div className="oh-prose py-6 text-[14px] text-oh-graphite xl:w-2/3" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className="oh-prose whitespace-pre-line py-6 text-[14px] text-oh-graphite xl:w-2/3">{html}</div>
  )
}

const SpecsTab = ({ rows }: { rows: [string, string][] }) => {
  if (!rows.length) return <p className="py-6 text-sm text-oh-muted">Характеристики не заполнены.</p>
  return (
    <dl className="grid grid-cols-1 gap-x-8 py-6 text-[14px] small:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-dashed border-oh-line py-2">
          <dt className="text-oh-muted">{k}</dt>
          <dd className="text-right text-oh-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ProductTabs
