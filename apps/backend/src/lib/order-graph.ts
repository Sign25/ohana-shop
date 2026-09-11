/** Поля заказа для документов и виджетов менеджера */
export const ORDER_DOC_FIELDS = [
  "id", "display_id", "created_at", "email", "status", "payment_status", "fulfillment_status", "total", "shipping_total", "metadata",
  "items.id", "items.title", "items.product_title", "items.variant_title", "items.quantity", "items.unit_price", "items.total", "items.thumbnail", "items.metadata",
  "items.variant.sku", "items.variant.metadata", "items.variant.product.thumbnail", "items.variant.product.metadata",
  "shipping_address.*", "shipping_methods.name",
]
