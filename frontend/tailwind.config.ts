import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf8",
          100: "#e1f8f0",
          200: "#c3f0e1",
          300: "#95e3cc",
          400: "#5ecdb1",
          500: "#10b981", // Accent green
          600: "#0b9674",
          700: "#08765a", // Primary brand green
          800: "#064e3b", // Dark green
          900: "#043427",
          950: "#022119",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f7faf9", // Light background
          muted: "#f1f5f4",
        },
        content: {
          primary: "#14231d", // Primary text
          secondary: "#64748b", // Secondary text
          muted: "#94a3b8",
        },
        border: {
          DEFAULT: "#e2e8f0", // Border
          subtle: "#f1f5f9",
          focus: "#08765a",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        "card-hover": "0 10px 25px -5px rgb(15 23 42 / 0.08), 0 8px 10px -6px rgb(15 23 42 / 0.04)",
        dropdown: "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.04)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
