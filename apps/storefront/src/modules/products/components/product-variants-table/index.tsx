import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes, StoreProduct, StoreProductVariant } from "@medusajs/types"
import { clx, Table } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useState } from "react"
import BulkTableQuantity from "../bulk-table-quantity"

const ProductVariantsTable = ({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [lineItemsMap, setLineItemsMap] = useState<
    Map<
      string,
      StoreProductVariant & {
        product: StoreProduct
        quantity: number
      }
    >
  >(new Map())

  const totalQuantity = Array.from(lineItemsMap.values()).reduce(
    (acc, curr) => acc + curr.quantity,
    0
  )

  const handleQuantityChange = (variantId: string, quantity: number) => {
    setLineItemsMap((prev) => {
      const newLineItems = new Map(prev)

      if (!prev.get(variantId)) {
        newLineItems.set(variantId, {
          ...product.variants?.find((v) => v.id === variantId)!,
          product,
          quantity,
        })
      } else {
        newLineItems.set(variantId, {
          ...prev.get(variantId)!,
          quantity,
        })
      }

      return newLineItems
    })
  }

  const handleAddToCart = async () => {
    setIsAdding(true)

    const lineItems = Array.from(lineItemsMap.entries()).map(
      ([variantId, { quantity, ...variant }]) => ({
        productVariant: {
          ...variant,
        },
        quantity,
      })
    )

    addToCartEventBus.emitCartAdd({
      lineItems,
      regionId: region.id,
    })

    setIsAdding(false)
  }

  // колонки опций, у которых больше одного значения (одноцветный товар — без колонки «Цвет»)
  const visibleOptions = (product.options || []).filter(
    (o) => o.title !== "Default option" && (o.values?.length ?? 0) > 1
  )
  const optionValue = (variant: any, optionId: string) =>
    variant.options?.find((o: any) => o.option_id === optionId)?.value

  return (
    <div className="flex flex-col gap-4">
      {/* Телефон: список размеров вместо широкой таблицы */}
      <ul className="flex flex-col divide-y divide-oh-line rounded-xl border border-oh-line bg-white small:hidden">
        {product.variants?.map((variant) => {
          const { variantPrice } = getProductPrice({ product, variantId: variant.id })
          const qty = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : undefined
          return (
            <li key={variant.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-oh-ink">
                  {visibleOptions.map((o) => optionValue(variant, o.id)).filter(Boolean).join(" · ") || variant.title}
                </div>
                <div className="text-[11px] text-oh-muted">
                  {variantPrice?.calculated_price}
                  {qty !== undefined && (qty > 0 ? ` · ${qty} шт` : " · нет в наличии")}
                </div>
              </div>
              <div className="w-[128px] shrink-0">
                <BulkTableQuantity
                  variantId={variant.id}
                  onChange={handleQuantityChange}
                  step={Number((variant.metadata as any)?.qty_step) || 1}
                  max={qty}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <div className="hidden overflow-x-auto p-px small:block">
        <Table className="w-full rounded-xl overflow-hidden shadow-borders-base border-none ">
          <Table.Header className="border-t-0">
            <Table.Row className="bg-oh-paper border-none hover:!bg-oh-paper">
              <Table.HeaderCell className="px-4">Артикул</Table.HeaderCell>
              {visibleOptions.map((option) => (
                <Table.HeaderCell key={option.id} className="px-4 border-x">
                  {option.title}
                </Table.HeaderCell>
              ))}
              <Table.HeaderCell className="px-4 border-x">
                Цена
              </Table.HeaderCell>
              <Table.HeaderCell className="px-3 border-r">Остаток</Table.HeaderCell>
              <Table.HeaderCell className="px-4">Кол-во</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body className="border-none">
            {product.variants?.map((variant, index) => {
              const { variantPrice } = getProductPrice({
                product,
                variantId: variant.id,
              })

              return (
                <Table.Row
                  key={variant.id}
                  className={clx({
                    "border-b-0": index === product.variants?.length! - 1,
                  })}
                >
                  <Table.Cell className="px-4">{variant.sku}</Table.Cell>
                  {/* значения опций берём по option_id в порядке колонок товара: у варианта массив options
                      приходит в произвольном порядке, и «Размер»/«Цвет» иначе меняются местами */}
                  {visibleOptions.map((productOption) => (
                    <Table.Cell key={productOption.id} className="px-4 border-x">
                      {optionValue(variant, productOption.id)}
                    </Table.Cell>
                  ))}
                  <Table.Cell className="px-4 border-x whitespace-nowrap">
                    {variantPrice?.calculated_price}
                  </Table.Cell>
                  <Table.Cell className="px-3 border-r text-center text-oh-muted whitespace-nowrap">
                    {typeof variant.inventory_quantity === "number" ? (variant.inventory_quantity > 0 ? variant.inventory_quantity : "—") : ""}
                  </Table.Cell>
                  <Table.Cell className="pl-1 !pr-1">
                    <BulkTableQuantity
                      variantId={variant.id}
                      onChange={handleQuantityChange}
                      step={Number((variant.metadata as any)?.qty_step) || 1}
                      max={typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : undefined}
                    />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
      <Button
        onClick={handleAddToCart}
        variant="primary"
        className="w-full h-11 !rounded-pill !bg-oh-primary hover:!bg-oh-primary-hover !border-none !shadow-none"
        isLoading={isAdding}
        disabled={totalQuantity === 0}
        data-testid="add-product-button"
      >
        <ShoppingBag
          className="text-white"
          fill={totalQuantity === 0 ? "none" : "#fff"}
        />
        {totalQuantity === 0
          ? "Укажите количество по размерам"
          : `В корзину · ${totalQuantity} шт`}
      </Button>
    </div>
  )
}

export default ProductVariantsTable
