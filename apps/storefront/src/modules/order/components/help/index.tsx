const Help = () => {
  return (
    <div className="mt-6 rounded-card bg-oh-paper p-4 text-[13px] text-oh-graphite">
      <div className="mb-1 font-semibold text-oh-ink">Вопросы по заказу</div>
      <div>
        Менеджер: <a href="tel:+79914301730" className="font-medium text-oh-ink hover:text-oh-azure">8 (991) 430-17-30</a>, пн–пт 10:00–18:00 (Омск) ·{" "}
        <a href="mailto:info@ohanamarket.ru" className="hover:text-oh-azure">info@ohanamarket.ru</a>
      </div>
      <div className="mt-1">
        <a href="https://ohanaopt.ru/return/" className="underline hover:text-oh-azure">Возврат и обмен</a> · <a href="https://ohanaopt.ru/faq/" className="underline hover:text-oh-azure">Вопросы и ответы</a>
      </div>
    </div>
  )
}

export default Help
