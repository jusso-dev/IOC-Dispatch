import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-9 w-full rounded-none border border-rule bg-paper-sunken px-2.5 text-[13px] text-ink placeholder:text-ink-mute",
      "transition-colors duration-120 ease-out-quart",
      "focus-visible:outline-none focus-visible:border-signal focus-visible:bg-paper-raised",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
