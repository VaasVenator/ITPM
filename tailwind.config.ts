import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        accent: "#10B981",
        secondary: "#64748B",
        background: "#FFFFFF",
        highlight: "#D1FAE5",
        brand: {
          DEFAULT: "#10B981",
          dark: "#059669"
        }
      }
    }
  },
  plugins: []
};

export default config;
