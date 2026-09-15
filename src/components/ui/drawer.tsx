"use client";

import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useModalFocus } from "@/components/ui/dialog";

export function Drawer({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useModalFocus(open, onClose, panelRef);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar panel"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-overlay"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(360px,92vw)] flex-col border-l border-border-strong bg-background shadow-pop",
          className
        )}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 id={titleId} className="kicker text-text-2">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar panel"
            title="Cerrar panel"
          >
            <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        </header>
        {children}
      </aside>
    </>
  );
}
