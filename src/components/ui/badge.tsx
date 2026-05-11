import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        // Default: ruled outline on transparent
        default:
          "border-rule-strong bg-transparent text-ink",
        outline:
          "border-rule bg-transparent text-ink-dim",
        muted:
          "border-rule-faint bg-paper-raised text-ink-faint",
        secondary:
          "border-rule bg-paper-raised text-ink",
        // Status tones — colored border + colored text, transparent fill
        success:
          "border-ok text-ok",
        warning:
          "border-warn text-warn",
        destructive:
          "border-bad text-bad",
        info:
          "border-info text-info",
        // High-contrast plotter-pen badge for public-submission marker
        signal:
          "border-signal text-signal",
        // Filled (rare; reserved for transport='playwright' warning)
        filled:
          "border-warn bg-warn text-[var(--paper)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
