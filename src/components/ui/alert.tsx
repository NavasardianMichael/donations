import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-sm border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-info-subtle bg-info-subtle text-info-fg",
      success: "border-success-subtle bg-success-subtle text-success-fg",
      warning: "border-warning-subtle bg-warning-subtle text-warning-fg",
      danger: "border-danger-subtle bg-danger-subtle text-danger-fg",
      neutral: "border-subtle bg-surface-sunken text-fg",
    },
  },
  defaultVariants: { variant: "info" },
});

const defaultIcons: Record<string, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
};

export interface AlertProps
  extends
    Omit<React.ComponentPropsWithRef<"div">, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  /** Pass `false` to drop the leading glyph. */
  icon?: LucideIcon | false;
  /** Right-aligned slot — usually a Button. */
  action?: React.ReactNode;
}

export function Alert({
  className,
  variant = "info",
  title,
  icon,
  action,
  children,
  ...props
}: AlertProps) {
  const Icon =
    icon === false ? null : (icon ?? defaultIcons[variant ?? "info"]);

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      ) : null}
      <div className="flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="[&_a]:underline">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export { alertVariants };
