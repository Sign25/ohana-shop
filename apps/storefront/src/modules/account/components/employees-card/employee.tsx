"use client"

import { currencySymbolMap } from "@/lib/constants"
import { deleteEmployee, updateEmployee } from "@/lib/data/companies"
import {
  getOrderTotalInSpendWindow,
  getSpendWindow,
} from "@/lib/util/check-spending-limit"
import { formatAmount } from "@/modules/common/components/amount-cell"
import Button from "@/modules/common/components/button"
import NativeSelect from "@/modules/common/components/native-select"
import {
  B2BCustomer,
  QueryCompany,
  QueryEmployee,
  StoreUpdateEmployee,
} from "@/types"
import { HttpTypes } from "@medusajs/types"
import { CurrencyInput, Prompt, Text, clx, toast } from "@medusajs/ui"
import { useState } from "react"

const RemoveEmployeePrompt = ({ employee }: { employee: QueryEmployee }) => {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    setIsRemoving(true)
    await deleteEmployee(employee.company_id, employee.id).catch(() => {
      toast.error("Не удалось удалить сотрудника")
    })
    setIsRemoving(false)

    toast.success("Сотрудник удалён")
  }

  return (
    <Prompt variant="danger">
      <Prompt.Trigger asChild>
        <Button variant="transparent">Удалить</Button>
      </Prompt.Trigger>
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>Удалить сотрудника</Prompt.Title>
          <Prompt.Description>
            Are you sure you want to remove{" "}
            <strong>{employee.customer.email}</strong> from your team? They will
            no longer be able to purchase on behalf of your company.
          </Prompt.Description>
        </Prompt.Header>
        <Prompt.Footer>
          <Prompt.Cancel className="h-10 rounded-full shadow-borders-base">
            Cancel
          </Prompt.Cancel>
          <Prompt.Action
            className="h-10 px-4 rounded-full shadow-none"
            onClick={handleRemove}
          >
            Remove
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}

const Employee = ({
  employee,
  company,
  orders,
  customer,
}: {
  employee: QueryEmployee
  company: QueryCompany
  orders: HttpTypes.StoreOrder[]
  customer: B2BCustomer | null
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [employeeData, setEmployeeData] = useState({
    id: employee.id,
    company_id: employee.company_id,
    spending_limit: employee.spending_limit.toString(),
    is_admin: employee.is_admin,
  })

  const isCurrentUser = employee.customer.id === customer?.id

  const handleSubmit = async () => {
    const updateData = {
      ...employeeData,
      spending_limit: parseFloat(employeeData.spending_limit),
    }

    setIsSaving(true)
    await updateEmployee(updateData as StoreUpdateEmployee).catch(() => {
      toast.error("Не удалось сохранить сотрудника")
    })

    setIsSaving(false)
    setIsEditing(false)

    toast.success("Сотрудник сохранён")
  }

  const spent = getOrderTotalInSpendWindow(orders, getSpendWindow(company)) || 0
  const amountSpent = formatAmount(spent, company.currency_code!)

  return (
    <div className="flex flex-col">
      <div className="flex justify-between p-4 border-b border-neutral-200">
        <div className="flex flex-col">
          <Text className=" text-neutral-950 font-medium">
            {employee.customer.first_name} {employee.customer.last_name}{" "}
            {isCurrentUser && "(You)"}{" "}
            {employee.is_admin && (
              <>
                {" • "}
                <span className="text-blue-500">Администратор</span>
              </>
            )}
          </Text>
          <div className="flex gap-x-2 small:flex-row flex-col">
            <Text className=" text-neutral-500">{employee.customer.email}</Text>
            <Text className=" text-neutral-500 hidden small:block">
              {" • "}
            </Text>
            <Text className=" text-neutral-500">{employee.customer.phone}</Text>
            <Text className=" text-neutral-500 hidden small:block">
              {" • "}
            </Text>
            <Text className=" text-neutral-500">
              {amountSpent} /{" "}
              {employee.spending_limit > 0
                ? formatAmount(employee.spending_limit, company.currency_code!)
                : "Без лимита"}{" "}
              spent
            </Text>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSaving}
              >
                Сохранить
              </Button>
            </>
          ) : (
            <>
              {!isCurrentUser && <RemoveEmployeePrompt employee={employee} />}
              <Button
                variant="secondary"
                onClick={() => setIsEditing((prev) => !prev)}
              >
                Изменить
              </Button>
            </>
          )}
        </div>
      </div>
      <form
        className={clx(
          "bg-neutral-50 grid grid-cols-2 gap-4 border-b border-neutral-200 transition-all duration-300 ease-in-out",
          {
            "max-h-[98px] opacity-100 p-4": isEditing,
            "max-h-0 h-0 opacity-0 border-b-0": !isEditing,
          }
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleSubmit()
          }
        }}
      >
        <div className="flex flex-col gap-y-2">
          <Text className=" text-neutral-950 font-medium">Лимит расходов</Text>
          <CurrencyInput
            symbol={currencySymbolMap[company.currency_code!]}
            code={company.currency_code!}
            className="bg-white rounded-full"
            name="spending_limit"
            value={employeeData.spending_limit}
            onChange={(e) => {
              setEmployeeData({
                ...employeeData,
                spending_limit: e.target.value.replace(/[^0-9.]/g, ""),
              })
            }}
          />
        </div>
        <div className="flex flex-col gap-y-2">
          <Text className=" text-neutral-950 font-medium">Права</Text>
          <NativeSelect
            className="bg-white"
            name="permissions"
            value={employeeData.is_admin ? "true" : "false"}
            disabled={!customer?.employee?.is_admin}
            onChange={(e) => {
              setEmployeeData({
                ...employeeData,
                is_admin: e.target.value === "true",
              })
            }}
          >
            <option value="true">Администратор</option>
            <option value="false">Сотрудник</option>
          </NativeSelect>
        </div>
      </form>
    </div>
  )
}

export default Employee
