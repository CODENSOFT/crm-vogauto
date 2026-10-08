import type { Config } from "tailwindcss";

const config: Config = {
  // Pe telefon, o atingere declanșa starea de hover și rămânea „lipită".
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        card: "20px",
        shell: "28px",
      },
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
        // Tokenuri semantice folosite de primitivele shadcn (grafice, tooltip).
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        // Bara laterală — navy profesional, profund.
        sidebar: {
          DEFAULT: "#0a0f1d",
          hover: "#151d33",
          active: "#1c2845",
          border: "#1b2540",
          muted: "#8493b0",
        },
        // Negrul cald al machetei: pilula activă din meniu, butoanele închise.
        ink: {
          DEFAULT: "#0b1220",
          soft: "#1a2233",
          muted: "#8a91a6",
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
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.03), 0 10px 26px -18px rgba(16, 24, 40, 0.22)",
        "card-hover":
          "0 2px 4px 0 rgba(16, 24, 40, 0.04), 0 18px 36px -20px rgba(16, 24, 40, 0.28)",
        // Carcasa care plutește peste fundalul colorat.
        shell: "0 30px 70px -28px rgba(49, 46, 129, 0.30), 0 2px 8px -4px rgba(16, 24, 40, 0.06)",
        pill: "0 8px 18px -8px rgba(11, 18, 32, 0.45)",
        elevated:
          "0 10px 30px -12px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)",
        glow: "0 8px 24px -6px rgba(37, 99, 235, 0.45)",
        "inner-top": "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "app-gradient":
          "radial-gradient(900px 520px at 88% -5%, #e9dcef 0%, transparent 58%), radial-gradient(820px 620px at -5% 105%, #dde5fb 0%, transparent 55%), linear-gradient(135deg, #f3f4fc 0%, #e9eaf8 48%, #efe9f6 100%)",
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
      // Curbele implicite din CSS sunt prea slabe; acestea dau senzația de
      // intenție. „out" pentru intrări (pornește rapid, răspunde imediat).
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      animation: {
        "fade-in": "fade-in 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
