import NativeSelect, {
  NativeSelectProps,
} from "@/modules/common/components/native-select"
import { HttpTypes } from "@medusajs/types"
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion
  }
>(({ placeholder = "Страна", region, defaultValue, ...props }, ref) => {
  const innerRef = useRef<HTMLSelectElement>(null)

  useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
    ref,
    () => innerRef.current
  )

  const countryOptions = useMemo(() => {
    if (!region) {
      return []
    }

    return region.countries?.map((country) => ({
      value: country.iso_2,
      // названия стран приходят по-английски; для нашего региона показываем по-русски
      label: ({ ru: "Россия", by: "Беларусь", kz: "Казахстан", kg: "Киргизия", am: "Армения", uz: "Узбекистан" } as Record<string, string>)[country.iso_2 || ""] || country.display_name,
    }))
  }, [region])

  return (
    <NativeSelect
      ref={innerRef}
      placeholder={placeholder}
      defaultValue={defaultValue}
      {...props}
    >
      {countryOptions?.map(({ value, label }, index) => (
        <option key={index} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
  )
})

CountrySelect.displayName = "CountrySelect"

export default CountrySelect
