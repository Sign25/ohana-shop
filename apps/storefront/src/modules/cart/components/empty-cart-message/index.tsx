import LocalizedClientLink from "@/modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div className="flex flex-col items-start gap-4 px-2 py-32" data-testid="empty-cart-message">
      <h1 className="oh-h text-[30px]">Корзина пуста</h1>
      <p className="max-w-[40ch] text-[14px] text-oh-graphite">
        Добавьте товары размерным рядом со страницы товара. Минимальный оптовый заказ — 35 000 ₽, от 100 000 ₽ действует цена крупного опта.
      </p>
      <LocalizedClientLink href="/store" className="oh-btn">
        Перейти в каталог
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
