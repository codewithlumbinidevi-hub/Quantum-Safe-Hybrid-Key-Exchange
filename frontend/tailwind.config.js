/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Original cyber palette (preserved for existing pages)
        cyber: {
          bg: "#070b14",
          surface: "#0f172a",
          card: "#131d33",
          border: "#1e293b",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          purple: "#8b5cf6",
          emerald: "#10b981",
          rose: "#f43f5e",
        },
        // Q-SHIELD Scanner palette — warm ivory & muted maroon
        qs: {
          ivory:     "#F8F6F1",
          content:   "#FBFAF7",
          maroon:    "#963B43",
          maroonDark:"#7F3038",
          text:      "#292824",
          textMuted: "#8C877F",
          border:    "#E8E1D8",
          softMaroon:"#F4E8E7",
          success:   "#3E9B70",
          warning:   "#C58B3A",
          critical:  "#C74848",
          codeBase:  "#17191D",
          codeText:  "#D8DEE9",
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
