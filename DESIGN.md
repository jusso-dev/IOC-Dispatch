# Design

## Theme

Industrial blueprint. Schematic-style chrome (hairline rules, register marks, mono headers, gridded backgrounds), with a single restrained accent. Dark default; light theme is a true engineering-paper variant, not a tint-flip. Reference floor: Linear, Raycast, Vercel logs, Sentry, GitHub PRs — restrained, dense, opinionated. Refuse: SaaS-cream, cyber-marketing (matrix green, glitch, hex skulls), and generic dashboard hero-metric layouts.

The scene that decides theme defaults: SOC analyst at 2am on a 27" monitor in a dim room, paste-and-glance flow. Dark wins by default. A manual toggle exists; preference is persisted client-side.

## Color (OKLCH, restrained)

Neutrals are warm-cool tinted; never `#000` or `#fff`. Single accent (`signal`) carries call-to-action and "this batch did the work" semantics. Status colors are reserved for status; not used as decoration.

```text
DARK (default)
  --paper:        oklch(0.16 0.012 250)   /* near-black, faint cyan tint */
  --paper-raised: oklch(0.20 0.012 250)
  --ink:          oklch(0.96 0.005 250)   /* primary text */
  --ink-dim:      oklch(0.72 0.008 250)   /* secondary */
  --ink-faint:    oklch(0.52 0.008 250)   /* labels, captions */
  --rule:         oklch(0.30 0.010 250)   /* hairlines, borders */
  --rule-strong:  oklch(0.42 0.010 250)
  --grid:         oklch(0.22 0.008 250)   /* schematic gridlines */
  --signal:       oklch(0.78 0.18 76)     /* amber plotter-pen accent */
  --signal-ink:   oklch(0.20 0.010 250)
  --ok:           oklch(0.78 0.14 165)    /* teal-green, not Slack-green */
  --warn:         oklch(0.82 0.16 76)
  --bad:          oklch(0.70 0.18 25)     /* terracotta, not fire-red */
  --info:         oklch(0.78 0.10 240)

LIGHT (engineering-paper variant)
  --paper:        oklch(0.985 0.005 90)   /* warm draughting paper */
  --paper-raised: oklch(0.965 0.006 90)
  --ink:          oklch(0.18 0.010 250)
  --ink-dim:      oklch(0.42 0.010 250)
  --ink-faint:    oklch(0.58 0.010 250)
  --rule:         oklch(0.84 0.010 250)
  --rule-strong:  oklch(0.62 0.010 250)
  --grid:         oklch(0.92 0.008 250)
  --signal:       oklch(0.62 0.18 38)     /* deeper plotter amber */
  --signal-ink:   oklch(0.99 0.003 90)
  --ok:           oklch(0.48 0.12 165)
  --warn:         oklch(0.62 0.14 60)
  --bad:          oklch(0.50 0.18 25)
  --info:         oklch(0.48 0.12 240)
```

Strategy: **Restrained** (one accent ≤10% of surface). `signal` is reserved for the active in-flight action and the "this batch sent data" marker. Never decorative.

## Typography

Two families, picked for engineering-document feel:

- **Display + body**: Inter (variable). Used at small sizes only, mostly for body copy and navigation.
- **Mono**: JetBrains Mono (variable). Used for: indicator values, batch IDs, provider IDs, section headers (uppercased, tracked), table headers, status chips, anything that should read like a logfile.

Mono is not a code accent; it carries the personality of the product. Body sans plays support.

Type scale (1.25 ratio, but most surfaces use only three steps):

```text
display-1: 32px / 1.10 / -0.02em / mono medium
heading-1: 22px / 1.15 / -0.01em / mono medium uppercase tracked 0.04em
heading-2: 14px / 1.20 /  0.04em / mono semibold uppercase tracked 0.12em (label)
body:      14px / 1.5  /  0      / inter regular
body-sm:   13px / 1.45 /  0      / inter regular
mono-sm:   12.5px / 1.4 / 0      / jetbrains mono regular
caption:   11px / 1.3  /  0.08em / mono uppercase tracked
```

No drop shadows on text. No gradient text. No italic body. Tabular-nums on every number column.

## Layout

- **Three-region app shell**: top bar (1.75rem, hairline-ruled, register marks at corners), left meta-rail (10rem on desktop, collapses on mobile), main canvas. The rail shows context: env mode (`mode=dark`), active batch ID if applicable, environment health (redis/postgres dot).
- **Schematic gridlines**: a 32px gridline pattern is visible on empty/blueprint surfaces (landing, empty states), faint enough to read as paper texture, not as a chart.
- **No cards as default**. Most content is delimited by hairline rules and full-width section bands. Cards exist only for provider tiles and dialog content. No nested cards.
- **Register marks** (small mono crosshair `+` in section corners) replace decorative borders on heavy sections.
- Density: 4-space gutter base (`0.5rem`). Table rows are 36px tall, never 48+. Padding inside ruled bands is 16/20/24, never 32+.
- Max content width: 1440px. Tables and preview surfaces are full-width minus rail.
- Containers are rare; most layout is full-bleed sectioning.

## Components

| Component | Description |
|---|---|
| **App shell** | Top bar with title block (`INTELRELAY / v0.1 / mode`), nav rendered as mono uppercase items separated by middle dot. Theme toggle is a small mono switch (`◐ / ◑`). |
| **Meta rail** | Left-aligned mono labels + values, vertical hairline. Examples: `BATCH: 7f3a1c…`, `REDIS: ok`, `PROVIDERS: 6/11`. |
| **Section header** | Mono uppercase, tracked, prefixed with a `[##]` register or hairline rule above. Subhead in `ink-dim`. |
| **Provider tile** | 1px ruled rectangle, no rounding past 2px. Header row: provider name + status disc (`●`). Indicator types as bordered mono pills. Transport line: `api / playwright / manual`. Public-submission warning as a single inline mono badge: `[ PUBLIC ]`. |
| **Indicator preview row** | Two-line: mono value + faint warning. Eligible providers shown as `provider:action` separated by `·`. Type rendered as a 2-letter mono badge (`URL`, `IP4`, `MD5`). |
| **Status disc** | 8px circle, color from status palette, paired with mono label. Discs only inline; never used as standalone decoration. |
| **Button** | Two variants. Primary: mono semibold, signal background, no rounding past 4px, no shadow, 1px outline. Secondary: outlined, mono, transparent. Destructive shares primary shape but uses `--bad`. Buttons are short verbs, lowercased mono (`parse`, `submit batch`, `retry failed`). |
| **Code/value display** | Mono with subtle background tint (raised paper), never a code-blockish gradient. Long values truncate middle (`44d8861…abb02f`), with full value in title attribute. |
| **Empty state** | Schematic-gridded canvas + single mono instruction + one primary button. No illustration. |
| **Toasts/alerts** | Full-width ruled band with leading mono badge (`[ WARN ]`, `[ INFO ]`) — never side-stripe borders. |
| **Dialog (confirmation)** | Centered, ruled, mono header. Listing of providers and counts. Two buttons: cancel + continue. Continue uses signal color only when an external send will happen; for lookup/dry-run it stays neutral. |

## Iconography

Minimal. Lucide icons only where they save typing (close X, copy, chevron). No icon grids. No decorative icons next to feature labels. Status uses discs, not icons.

## Motion

- Transitions limited to opacity and transform. 120ms ease-out (cubic-bezier(0.22, 1, 0.36, 1)).
- No bounce, no elastic, no parallax.
- Dialog enters with 80ms opacity fade only.
- Reduced motion media query disables all but opacity transitions.

## Implementation notes

- CSS variables expressed in OKLCH; legacy fallback not required (Next 15 + modern Chromium).
- Theme toggle persists via `localStorage` and applies a `data-theme` attribute on `<html>`.
- Mono font loaded via `next/font` with `display: swap`, variable weight axis.
- Tabular numerics enabled globally for `td`, status chips, and metric labels.
