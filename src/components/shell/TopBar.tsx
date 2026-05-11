import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "intel" },
  { href: "/submit", label: "submit" },
  { href: "/batches", label: "batches" },
  { href: "/settings/providers", label: "providers" },
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      {/* register marks at corners */}
      <div className="pointer-events-none absolute left-1.5 top-1.5 text-[10px] leading-none text-ink-mute mono">
        +
      </div>
      <div className="pointer-events-none absolute right-1.5 top-1.5 text-[10px] leading-none text-ink-mute mono">
        +
      </div>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-3">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="mono text-[13px] font-semibold uppercase tracking-widest text-ink">
            INTELRELAY
          </span>
          <span className="mono text-[10px] uppercase tracking-widest text-ink-faint">
            / v0.1
          </span>
        </Link>
        <nav className="flex items-center gap-1 mono text-[12px] uppercase tracking-widest">
          {NAV.map((n, i) => (
            <span key={n.href} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden className="text-ink-mute">
                  ·
                </span>
              )}
              <Link
                href={n.href}
                className="rounded-none px-2 py-1 text-ink-dim transition-colors duration-120 hover:text-ink"
              >
                {n.label}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
