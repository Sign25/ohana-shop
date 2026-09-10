"use client"

import { productSpecs } from "@/lib/util/ohana"
import { HttpTypes } from "@medusajs/types"
import Accordion from "./accordion"

/** Описание приходит из 1С HTML-ом; характеристики — из metadata товара (см. import-cscart.ts) */
const ProductTabs = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const specs = productSpecs(product)
  const tabs = [
    { label: "Описание", component: <DescriptionTab html={product.description || ""} /> },
    { label: "Характеристики", component: <SpecsTab rows={specs} /> },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple" defaultValue={["Описание", "Характеристики"]} className="flex flex-col gap-y-2">
        {tabs.map((tab) => (
          <Accordion.Item className="oh-card px-6 small:px-10" key={tab.label} title={tab.label} headingSize="medium" value={tab.label}>
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
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
