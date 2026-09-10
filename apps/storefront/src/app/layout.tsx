import { getBaseURL } from "@/lib/util/env"
import { Toaster } from "@medusajs/ui"
import { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "@/styles/globals.css"

// Основной шрифт брендбука. 600 нужно для заголовков карточек (см. ohana-happywear-redesign).
const montserrat = Montserrat({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Ohana Market — одежда и домашний текстиль оптом",
    template: "%s | Ohana Market",
  },
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-mode="light" className={montserrat.variable}>
      <body className="font-sans text-oh-graphite bg-white antialiased">
        <main className="relative">{props.children}</main>
        <Toaster className="z-[99999]" position="bottom-left" />
      </body>
    </html>
  )
}
