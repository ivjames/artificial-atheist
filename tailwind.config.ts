import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEEDFE",
          100: "#E0DDFB",
          200: "#C8B8FF",
          300: "#A99EE8",
          400: "#7F77DD",
          500: "#6357C9",
          600: "#534AB7",
          700: "#443CA0",
          800: "#363080",
          900: "#2A2560",
        },
      },
      fontFamily: {
        // next/font hashes the real family names; use its variables (defined
        // on <html> in app/layout.tsx) with the same fallbacks as before.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
