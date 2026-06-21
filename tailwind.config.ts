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
          "var(--font-inter)",
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
          DEFAULT: "#0a0f1d",
          hover: "#151d33",
          active: "#1c2845",
          border: "#1b2540",
          muted: "#8493b0",
        },
        // Accent principal — albastru corporativ.
        brand: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
          darker: "#1e40af",
          light: "#3b82f6",
          lighter: "#60a5fa",
          tint: "#eff4ff",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        "card-hover":
          "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
        elevated:
          "0 10px 30px -12px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)",
        glow: "0 8px 24px -6px rgba(37, 99, 235, 0.45)",
        "inner-top": "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        "sidebar-gradient":
          "linear-gradient(180deg, #0c1224 0%, #0a0f1d 60%, #080c17 100%)",
        "auth-gradient":
          "radial-gradient(1200px 600px at 15% -10%, #1e3a8a 0%, transparent 55%), radial-gradient(900px 500px at 110% 110%, #1d4ed8 0%, transparent 50%), linear-gradient(160deg, #0a0f1d 0%, #0c1530 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
