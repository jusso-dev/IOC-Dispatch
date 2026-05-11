import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-mono uppercase tracking-widest text-[11px] font-semibold",
    "border border-rule-strong",
    "rounded-[2px]",
    "transition-colors duration-120 ease-out-quart",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-offset-0",
    "disabled:cursor-not-allowed",
    "disabled:[&]:bg-paper-raised disabled:[&]:text-ink-mute disabled:[&]:border-rule",
    "select-none",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-signal text-signal-ink border-signal hover:brightness-95 active:brightness-90",
        secondary:
          "bg-paper text-ink border-rule-strong hover:bg-paper-raised",
        outline:
          "bg-transparent text-ink-dim border-rule hover:text-ink hover:border-rule-strong",
        ghost:
          "bg-transparent text-ink-dim border-transparent hover:text-ink hover:border-rule",
        destructive:
          "bg-bad text-[var(--paper)] border-bad hover:brightness-95",
        link:
          "border-transparent bg-transparent text-ink underline underline-offset-4 decoration-rule-strong hover:decoration-ink",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-7 px-2 text-[10px]",
        lg: "h-10 px-4 text-[12px]",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
