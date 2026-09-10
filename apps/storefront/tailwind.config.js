module.exports = {
  darkMode: "class",
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
    "../../node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        "8xl": "100rem",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      // Брендбук Ohana: Montserrat — основной, RF Rufo — акцидентный (заголовки разделов)
      fontFamily: {
        sans: ["var(--font-montserrat)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["RF Rufo", "var(--font-montserrat)", "sans-serif"],
      },
      // Палитра Ohana (см. память ohana-brand-colors / ohana-color-rebalance):
      // primary — только главные CTA; azure — функциональное/выбор/крупный опт; graphite — текст
      colors: {
        oh: {
          primary: "#F4503A",
          "primary-hover": "#DC3C28",
          "primary-light": "#F87A66",
          graphite: "#4A4A4A",
          ink: "#3A3A3A",
          muted: "#8A8178",
          beige: "#F5E9D3",
          cream: "#F7EDE1",
          paper: "#FBF8F3",
          line: "#EDE5D8",
          "line-2": "#E4D9CB",
          azure: "#246075",
          mint: "#A9C9B3",
          "mint-deep": "#5FA88C",
          gold: "#E69C4E",
          lavender: "#C4B2D1",
        },
      },
      borderRadius: {
        pill: "999px",
        card: "14px",
      },
      keyframes: {
        "accordion-open": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-close": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-open": "accordion-open 0.3s ease-out",
        "accordion-close": "accordion-close 0.3s ease-out",
      },
    },
  },
}
