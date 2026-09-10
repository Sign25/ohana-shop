import { clx, Button as MedusaButton } from "@medusajs/ui"
type ButtonProps = React.ComponentProps<typeof MedusaButton>

/** Единая кнопка: primary — фирменный коралл (единственное место терракота), secondary — ghost с рамкой */
const Button = ({ children, className: classNameProp, ...props }: ButtonProps): React.ReactNode => {
  const variant = props.variant ?? "primary"

  const className = clx(classNameProp, {
    "!shadow-none !border !border-oh-line-2 !bg-white !text-oh-ink hover:!border-oh-azure hover:!text-oh-azure": variant === "secondary",
    "!shadow-none !border-none !bg-oh-primary !text-white hover:!bg-oh-primary-hover": variant === "primary" && !props.disabled,
    "!shadow-none !border-none !bg-oh-primary/40 !text-white": variant === "primary" && props.disabled,
    "!shadow-none !border-none bg-transparent text-oh-ink": variant === "transparent",
  })

  return (
    <MedusaButton className={`!rounded-pill text-[15px] font-medium ${className}`} variant={variant} {...props}>
      {children}
    </MedusaButton>
  )
}

export default Button
