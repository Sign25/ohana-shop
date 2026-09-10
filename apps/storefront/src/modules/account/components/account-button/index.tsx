import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import User from "@/modules/common/icons/user"
import { B2BCustomer } from "@/types/global"

export default async function AccountButton({
  customer,
}: {
  customer: B2BCustomer | null
}) {
  return (
    <LocalizedClientLink className="hover:text-oh-azure" href="/account">
      <button className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm hover:bg-oh-paper">
        <User />
        <span className="hidden small:inline-block">
          {customer ? customer.first_name || "Кабинет" : "Войти"}
        </span>
      </button>
    </LocalizedClientLink>
  )
}
