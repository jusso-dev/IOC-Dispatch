import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Alert — full-width ruled band with a leading mono badge.
 * Never uses a colored side-stripe; status comes from the bracketed label
 * at the start and (for destructive/warning) a colored hairline border.
 */
const alertVariants = cva(
  "flex items-start gap-3 border px-4 py-3 text-[13px] leading-snug",
  {
    variants: {
      variant: {
        default: "border-rule bg-paper-raised text-ink",
        info: "border-info/60 bg-paper-raised text-ink",
        warning: "border-warn/60 bg-paper-raised text-ink",
        destructive: "border-bad/70 bg-paper-raised text-ink",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const TAG: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  { label: string; tone: string }
> = {
  default: { label: "INFO", tone: "text-ink-faint" },
  info: { label: "INFO", tone: "text-info" },
  warning: { label: "WARN", tone: "text-warn" },
  destructive: { label: "ERR", tone: "text-bad" },
};

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const tag = TAG[variant ?? "default"];
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex shrink-0 mono text-[10px] font-semibold uppercase tracking-widest",
          tag.tone
        )}
      >
        [ {tag.label} ]
      </span>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mono text-[12px] font-semibold uppercase tracking-widest text-ink",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[13px] text-ink-dim", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
