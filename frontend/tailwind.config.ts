import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.05), 0 8px 24px -12px rgb(15 23 42 / 0.18)",
      },
      fontFamily: { sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
