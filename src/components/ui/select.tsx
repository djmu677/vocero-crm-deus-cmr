import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.ComponentPropsWithRef<"select">) {
  return (
    <select
      className={cn(
        "flex h-control w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
