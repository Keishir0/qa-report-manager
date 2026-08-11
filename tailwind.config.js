/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-open-sans)", "Open Sans", "Arial", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#4f6ef7", // Base brand color
          600: "#3b55d9",
          700: "#2d3fb8",
          800: "#212e94",
          900: "#182073",
          DEFAULT: "#4f6ef7",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        fg2: "rgb(var(--fg-2) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentFg: "rgb(var(--accent-fg) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        neutral: "rgb(var(--neutral) / <alpha-value>)",
      },
      // opacidades usadas pelo redesign (fundos/bordas translúcidas dos tokens de status)
      opacity: {
        8: "0.08",
        12: "0.12",
        16: "0.16",
        20: "0.2",
        30: "0.3",
        35: "0.35",
      },
    },
  },
  plugins: [],
};
