import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terminal Noir surfaces
        base: "#07090d",
        card: "#0e1117",
        elevated: "#161b24",
        border: "rgba(255,255,255,0.06)",
        // Text
        primary: "#f0f4f8",
        secondary: "#94a3b8",
        muted: "#64748b",
        // Brain accent palette
        ae: "#22d3ee",      // AI Engineering — cyan
        se: "#a78bfa",      // Software Engineering — violet
        cloud: "#60a5fa",   // Cloud/Infra — blue
        qa: "#34d399",      // QA — emerald
        techqa: "#f97316",  // Technical QA — orange
        papers: "#fb923c",  // Papers — amber
        math: "#e879f9",    // Math — fuchsia
        data: "#facc15",    // Data — yellow
        safety: "#f87171",  // Safety — red
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Menlo", "monospace"],
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
