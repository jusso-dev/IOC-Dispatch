import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  id?: string;
  label?: string; // mono uppercase label
  title?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode; // right-side metadata
  registerMark?: string; // e.g. "01"
  flush?: boolean; // remove inner padding
}

/**
 * Ruled section band. The default chrome on most pages.
 * Replaces the "card-stack" pattern.
 */
export function Section({
  id,
  label,
  title,
  description,
  meta,
  registerMark,
  flush,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("border-t border-rule pt-5", className)}
      {...rest}
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          {(label || registerMark) && (
            <span className="mono text-[10px] font-semibold uppercase tracking-widest text-ink-mute tabular-nums">
              {registerMark && <span className="mr-2">[{registerMark}]</span>}
              {label}
            </span>
          )}
          {title && (
            <h2 className="mono text-[18px] font-medium tracking-tight text-ink">
              {title}
            </h2>
          )}
        </div>
        {meta && (
          <div className="mono text-[11px] uppercase tracking-widest text-ink-faint">
            {meta}
          </div>
        )}
      </header>
      {description && (
        <p className="-mt-2 mb-4 max-w-[68ch] text-[13px] leading-relaxed text-ink-dim">
          {description}
        </p>
      )}
      <div className={cn(flush ? "" : "")}>{children}</div>
    </section>
  );
}
