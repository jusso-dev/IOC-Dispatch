# Product

## Register

product

## Users

SOC analysts, threat-intel operators, incident responders. They paste a list of indicators of compromise mid-incident and need it routed to the right submission/lookup providers without ceremony. Working context: dim room, large monitor, often a second screen of logs or a SIEM, sometimes 2am. They are technical, type fast, prefer keyboard, distrust marketing surfaces, and bounce off anything that looks like a vendor booth.

## Product Purpose

IntelRelay is an API-first IOC submission router with safe browser-automation fallbacks for threat-intel platforms that do not provide submission APIs. The product replaces the manual chore of "copy this IP into AbuseIPDB, copy this URL into URLhaus, copy this hash into VirusTotal" with a single typed paste, a deterministic routing preview, and a logged record of every provider attempt. Success looks like: an analyst pastes a batch, scans the preview in five seconds, hits submit, and trusts the result page enough that they don't have to verify it elsewhere.

## Brand Personality

Engineering-grade, operator-respecting, technical. Three words: **deliberate, dense, honest**. Reads like a tool an SRE on the security team would build for themselves. No celebration of features, no growth-loop language, no "we" copy. Warnings before destructive actions are short and physical ("this becomes public"), not legalese. The product never apologizes for being information-dense.

## Anti-references

- **Generic AI-slop dashboards**: identical cards in a 3-column grid, big hero metric with a gradient accent, supporting stats below. Refuse.
- **Cyber-marketing cosplay**: matrix green, neon hex, glitch text, fake-terminal mockups, skulls, "powered by AI". This is a category reflex; explicitly avoid it.
- **Generic SaaS-cream**: rounded-2xl everything, pastel pill badges, soft gradient backgrounds, marketing illustrations.
- **Splunk / Kibana density-without-craft**: dense but visually broken, inconsistent type ramps, tooltip soup.

## Design Principles

1. **Operators first.** Optimize for the analyst reading the screen at 2am, not for a demo screenshot. Density is a feature, not a flaw.
2. **No vendor cosplay.** This is engineering software, not a security marketing site. The aesthetic should feel like Linear or Vercel logs UI, not a CrowdStrike booth.
3. **Routing is the product.** The deterministic per-indicator routing preview is the central artifact. Other surfaces support it.
4. **Honest warnings.** When a submission becomes public or shares data with a third party, say so plainly and once, in the exact spot the decision happens.
5. **Earn every pixel.** Decorative gradients, hero illustrations, and feature-marketing language are banned. Each element has a job.

## Accessibility & Inclusion

- WCAG 2.2 AA targeted across both themes.
- Status conveyed via shape/label as well as color (color-blind safe).
- Reduced motion respected; the design relies on type and rhythm, not animation.
- Keyboard-first: every primary action reachable without a mouse. Visible focus rings on every interactive element.
- Monospace-heavy presentation must remain readable at 14px; never collapse below that for indicator values.
