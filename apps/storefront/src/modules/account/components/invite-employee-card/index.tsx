"use client"

import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { QueryCompany } from "@/types"
import { Container, Text, toast } from "@medusajs/ui"

const InviteEmployeeCard = ({ company }: { company: QueryCompany }) => {
  return (
    <Container className="p-0 overflow-hidden">
      <div className="grid small:grid-cols-4 grid-cols-2 gap-4 p-4 border-b border-neutral-200">
        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">Имя</Text>
          <Input name="first_name" label="Имя" />
        </div>
        <div className="flex flex-col gap-y-2 justify-end">
          <Input name="last_name" label="Фамилия" />
        </div>
        <div className="flex flex-col col-span-2 gap-y-2">
          <Text className="font-medium text-neutral-950">Эл. почта</Text>
          <Input name="email" label="Введите эл. почту" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4">
        <Button variant="primary" onClick={() => toast.info("Смена пароля — через менеджера: 8 (991) 430-17-30")}>
          Send Invite
        </Button>
      </div>
    </Container>
  )
}

export default InviteEmployeeCard
