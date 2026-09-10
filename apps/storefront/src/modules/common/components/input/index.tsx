import { clx } from "@medusajs/ui"
import React, { useEffect, useImperativeHandle, useState } from "react"

import Eye from "@/modules/common/icons/eye"
import EyeOff from "@/modules/common/icons/eye-off"

type InputProps = Omit<Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, "placeholder"> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
  colSpan?: 1 | 2
  hint?: string
  placeholder?: string
}

/**
 * Поле формы: подпись над полем (а не «плавающая» внутри — на телефоне она сливалась со значением),
 * высота 44px под палец, обязательные помечены звёздочкой. У паролей — кнопка «показать».
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, name, label, touched, required, topLabel, colSpan = 1, className, hint, placeholder, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [inputType, setInputType] = useState(type)

    useEffect(() => {
      if (type === "password") setInputType(showPassword ? "text" : "password")
    }, [type, showPassword])

    useImperativeHandle(ref, () => inputRef.current!)
    const id = props.id || `f-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`

    return (
      <div className={clx("flex w-full flex-col gap-1", colSpan === 2 && "xsmall:col-span-2", className?.includes("col-span") && className)}>
        <label htmlFor={id} className="text-[13px] text-oh-graphite">
          {topLabel || label}
          {required && <span className="ml-0.5 text-oh-primary">*</span>}
        </label>
        <div className="relative flex w-full">
          <input
            type={inputType}
            name={name}
            id={id}
            placeholder={placeholder}
            required={required}
            className={clx(
              "h-11 w-full rounded-lg border border-oh-line-2 bg-white px-3 text-[15px] text-oh-ink placeholder:text-oh-muted/70 focus:border-oh-azure focus:outline-none focus:ring-2 focus:ring-oh-azure/15 disabled:bg-oh-paper",
              type === "password" && "pr-11",
              className?.replace(/small:col-span-2|xsmall:col-span-2|col-span-2/g, "")
            )}
            {...props}
            ref={inputRef}
          />
          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-oh-muted hover:text-oh-ink"
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          )}
        </div>
        {hint && <div className="text-[12px] text-oh-muted">{hint}</div>}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
