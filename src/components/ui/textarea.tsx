import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[120px] w-full rounded-none border border-rule bg-paper-sunken px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-mute",
      "transition-colors duration-120 ease-out-quart",
      "focus-visible:outline-none focus-visible:border-signal focus-visible:bg-paper-raised",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
