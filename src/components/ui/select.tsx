"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(({ className, options, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full appearance-none rounded-none border border-rule bg-paper-sunken bg-no-repeat pl-2.5 pr-7 text-[13px] text-ink",
      "transition-colors duration-120 ease-out-quart",
      "focus-visible:outline-none focus-visible:border-signal",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    style={{
      backgroundImage:
        "linear-gradient(45deg, transparent 50%, var(--ink-faint) 50%), linear-gradient(135deg, var(--ink-faint) 50%, transparent 50%)",
      backgroundPosition:
        "calc(100% - 12px) 50%, calc(100% - 8px) 50%",
      backgroundSize: "4px 4px",
    }}
    {...props}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
));
NativeSelect.displayName = "NativeSelect";
