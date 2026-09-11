import { Badge } from "@medusajs/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">Внимание:</span> Только для тестирования.
    </Badge>
  )
}

export default PaymentTest
