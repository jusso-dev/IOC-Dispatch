import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "JetBrains Mono",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        "paper-sunken": "var(--paper-sunken)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        "ink-faint": "var(--ink-faint)",
        "ink-mute": "var(--ink-mute)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        "rule-faint": "var(--rule-faint)",
        grid: "var(--grid)",
        signal: "var(--signal)",
        "signal-ink": "var(--signal-ink)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        bad: "var(--bad)",
        info: "var(--info)",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "2px",
        md: "3px",
        lg: "4px",
      },
      boxShadow: {
        none: "none",
        ruled: "inset 0 0 0 1px var(--rule)",
      },
      letterSpacing: {
        tightish: "-0.01em",
        wider: "0.04em",
        widest: "0.12em",
      },
      fontSize: {
        "display-1": ["32px", { lineHeight: "1.10", letterSpacing: "-0.02em" }],
        "h1": ["22px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "h2": ["14px", { lineHeight: "1.20", letterSpacing: "0.12em" }],
        body: ["14px", { lineHeight: "1.5" }],
        "body-sm": ["13px", { lineHeight: "1.45" }],
        "mono-sm": ["12.5px", { lineHeight: "1.4" }],
        caption: ["11px", { lineHeight: "1.3", letterSpacing: "0.08em" }],
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        80: "80ms",
        120: "120ms",
        160: "160ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
