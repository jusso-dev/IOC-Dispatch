"use client";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function readInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readInitial());
  }, []);

  function set(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("intelrelay.theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="group"
      aria-label="theme"
      className="mono inline-flex h-6 select-none items-stretch border border-rule text-[10px] uppercase tracking-widest text-ink-faint"
    >
      <button
        type="button"
        onClick={() => set("dark")}
        aria-pressed={theme === "dark"}
        className={`px-2 transition-colors duration-120 ${
          theme === "dark"
            ? "bg-paper-raised text-ink"
            : "hover:text-ink-dim"
        }`}
      >
        dark
      </button>
      <span aria-hidden className="w-px bg-rule" />
      <button
        type="button"
        onClick={() => set("light")}
        aria-pressed={theme === "light"}
        className={`px-2 transition-colors duration-120 ${
          theme === "light"
            ? "bg-paper-raised text-ink"
            : "hover:text-ink-dim"
        }`}
      >
        light
      </button>
    </div>
  );
}
