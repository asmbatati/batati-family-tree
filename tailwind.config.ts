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
        // Brand palette — desert / heritage tones for the البطاطي identity
        sand: {
          50: "#fbf7f0",
          100: "#f5ecd8",
          200: "#ead7ad",
          300: "#dcbb7c",
          400: "#c89c52",
          500: "#a87a34",
          600: "#7d5a26",
          700: "#553e1c",
          800: "#332512",
          900: "#1d1408"
        },
        // Relationship colors (used throughout the tree visualization)
        rel: {
          marriage: "#d4a017", // gold
          brotherhood: "#b3261e", // warm red
          milk: "#fffaf0", // ivory / cream (with dark border on light bg)
          parent: "#1b4965", // deep blue
          uncle: "#2e7d4f", // green
          aunt: "#7b3f9e", // purple
          other: "#666666"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "Tajawal", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 4px 14px -4px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)"
      }
    }
  },
  plugins: []
};

export default config;
