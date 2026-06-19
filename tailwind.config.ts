import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Bara laterală — navy profesional, profund.
        sidebar: {
          DEFAULT: "#0b1220",
          hover: "#16213a",
          active: "#1e2d4d",
          border: "#1c2740",
          muted: "#7c8aa5",
        },
        // Accent principal — albastru corporativ.
        brand: {
          DEFAULT: "#1d4ed8",
          dark: "#1e40af",
          light: "#3b82f6",
          tint: "#eff4ff",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
