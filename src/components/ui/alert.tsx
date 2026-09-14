import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg+div]:pl-7",
  {
    variants: {
      variant: {
        info: "border-info-soft bg-info-tint text-info-text",
        success: "border-success-soft bg-success-tint text-success-text",
        warning: "border-warning-soft bg-warning-tint text-warning-text",
        danger: "border-danger-soft bg-danger-tint text-danger-text",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn("mb-1 font-semibold leading-none", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm leading-5", className)} {...props} />;
}
