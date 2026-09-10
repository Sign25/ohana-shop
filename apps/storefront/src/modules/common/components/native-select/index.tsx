import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { SelectHTMLAttributes, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"

export type NativeSelectProps = {
  placeholder?: string
  label?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & SelectHTMLAttributes<HTMLSelectElement>

/** Выпадающий список в стиле полей формы (подпись над полем, 44px) */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder = "Выберите…", label, defaultValue, className, children, required, ...props }, ref) => {
    const innerRef = useRef<HTMLSelectElement>(null)
    const [isPlaceholder, setIsPlaceholder] = useState(false)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(ref, () => innerRef.current)

    useEffect(() => {
      setIsPlaceholder(!!innerRef.current && innerRef.current.value === "")
    }, [innerRef.current?.value])

    return (
      <div className={clx("flex w-full flex-col gap-1", className)}>
        {label && (
          <label className="text-[13px] text-oh-graphite">
            {label}
            {required && <span className="ml-0.5 text-oh-primary">*</span>}
          </label>
        )}
        <div
          className={clx(
            "relative flex h-11 items-center rounded-lg border border-oh-line-2 bg-white text-[15px] text-oh-ink focus-within:border-oh-azure focus-within:ring-2 focus-within:ring-oh-azure/15",
            { "text-oh-muted": isPlaceholder, "pointer-events-none opacity-50": props.disabled }
          )}
        >
          <select ref={innerRef} defaultValue={defaultValue} required={required} {...props} className="flex-1 appearance-none border-none bg-transparent px-3 py-2 outline-none">
            <option disabled value="">
              {placeholder}
            </option>
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-oh-muted">
            <ChevronUpDown />
          </span>
        </div>
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect
