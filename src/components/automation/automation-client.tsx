"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KanbanRulesSection,
} from "@/components/agent/agent-client";
import type { StageDto } from "@/lib/types";
import { TelegramAlertSection } from "@/components/automation/telegram-alert-section";
import { QuoteCatalogSection } from "@/components/automation/quote-catalog-section";

export function AutomationClient() {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const pipeline = await fetch("/api/pipeline/stages")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    if (pipeline) setStages(pipeline.stages);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-[17px] font-bold tracking-tight">Automatización</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define cómo avanza el agente, calcula pedidos y avisa al equipo.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
          <QuoteCatalogSection />
          <TelegramAlertSection />
          <KanbanRulesSection
            stages={stages}
            onChanged={() => void refetch()}
          />
        </div>
      )}
    </div>
  );
}
