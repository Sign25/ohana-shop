"use client"

import Accordion from "./accordion"

/** Аккордеон вкладок карточки (клиентская часть; содержимое вкладок готовит серверный ProductTabs) */
const ProductTabsView = ({ tabs }: { tabs: { label: string; component: React.ReactNode }[] }) => (
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

export default ProductTabsView
