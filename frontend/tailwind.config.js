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
        pmfit: {
          blue:              "#0052CC",
          "blue-light":      "#1D7EFF",
          "blue-subtle":     "#EBF2FF",
          purple:            "#6B5ACD",
          "purple-subtle":   "#F0EEFF",
          teal:              "#20C997",
          "teal-subtle":     "#E6FAF5",
          orange:            "#FF8C00",
          "orange-subtle":   "#FFF4E5",
          red:               "#E63946",
          "red-subtle":      "#FFF0F0",
          navy:              "#111827",
          "navy-hover":      "#1F2937",
          "navy-active":     "#374151",
          bg:                "#F5F7FF",
          surface:           "#FFFFFF",
          border:            "#E5E7EB",
          "border-subtle":   "#F3F4F6",
          text:              "#1A1A1A",
          "text-secondary":  "#6B7280",
          "text-muted":      "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        card:       "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-md":  "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        "card-lg":  "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",
        glow:       "0 0 24px rgba(0,82,204,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "border-glow": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },
      animation: {
        shimmer:        "shimmer 2s linear infinite",
        "gradient-x":  "gradient-shift 4s ease infinite",
        "spin-slow":   "spin-slow 3s linear infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        float:         "float 3s ease-in-out infinite",
      },
      backgroundSize: {
        "300%": "300%",
      },
    },
  },
  plugins: [],
};
