import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        surface: "#111111",
        "surface-raised": "#1A1A1A",
        border: "#2A2E2A",
        "border-bright": "#2F4A2F",
        green: {
          DEFAULT: "#55FF55",
          dim: "#3FCC3F",
          muted: "#2E5E2E",
        },
        gold: {
          DEFAULT: "#FFD700",
          dim: "#C9AC1E",
        },
        bad: {
          DEFAULT: "#FF5555",
          dim: "#B23A3A",
        },
        ink: {
          DEFAULT: "#E8E8E0",
          muted: "#8A8F8A",
          faint: "#52564F",
        },
      },
      fontFamily: {
        mono: ["var(--font-jbm)", "JetBrains Mono", "ui-monospace", "monospace"],
        display: ["var(--font-pixel)", "var(--font-jbm)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(85,255,85,0.25), 0 0 18px rgba(85,255,85,0.12)",
        "glow-gold":
          "0 0 0 1px rgba(255,215,0,0.25), 0 0 18px rgba(255,215,0,0.12)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
