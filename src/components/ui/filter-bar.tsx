import { cn } from "@/lib/utils";

export function FilterBar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="search"
      className={cn(
        "flex w-full flex-wrap items-center gap-2 rounded-lg border border-border-strong bg-subtle p-2 sm:w-auto",
        className
      )}
      {...props}
    />
  );
}
