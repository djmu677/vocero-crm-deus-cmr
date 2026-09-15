import React, { type ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function LoadingState({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-subtle p-6 text-center",
        className
      )}
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-5 w-5 animate-spin text-brand-text motion-reduce:animate-none"
        strokeWidth={1.8}
      />
      <p className="text-sm font-medium text-text-2">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-subtle p-6 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-text">
        {icon ?? <Inbox aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1 max-w-md text-sm leading-5 text-text-3">
        {description}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "No se pudo cargar",
  description,
  onRetry,
  retryLabel = "Reintentar",
  className,
}: {
  title?: string;
  description: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center rounded-lg border border-danger-soft bg-danger-tint p-6 text-center",
        className
      )}
    >
      <AlertCircle
        aria-hidden="true"
        className="mb-3 h-6 w-6 text-danger-text"
        strokeWidth={1.8}
      />
      <h3 className="text-sm font-semibold text-danger-text">{title}</h3>
      <div className="mt-1 max-w-md text-sm leading-5 text-danger-text">
        {description}
      </div>
      {onRetry ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
