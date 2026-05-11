"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-3.5 w-3.5 shrink-0 rounded-none border border-rule-strong bg-paper-sunken",
      "transition-colors duration-120 ease-out-quart",
      "focus-visible:outline-none focus-visible:border-signal",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-signal data-[state=checked]:border-signal data-[state=checked]:text-signal-ink",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center")}
    >
      <svg
        viewBox="0 0 10 10"
        className="h-2.5 w-2.5"
        aria-hidden
      >
        <path
          d="M1.5 5 4 7.5 8.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
