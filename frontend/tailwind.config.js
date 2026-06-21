/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg:                  "#FFFFFF",
          surface:             "#F5F5F7",
          border:              "#D2D2D7",
          "border-subtle":     "#E8E8ED",
          text:                "#1D1D1F",
          "text-secondary":    "#6E6E73",
          "text-tertiary":     "#AEAEB2",
          accent:              "#0071E3",
          "accent-hover":      "#0077ED",
          "accent-subtle":     "#EBF3FD",
          success:             "#34C759",
          "success-subtle":    "#EDFAF1",
          warning:             "#FF9500",
          "warning-subtle":    "#FFF4E5",
          destructive:         "#FF3B30",
          "destructive-subtle":"#FFF0EF",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
