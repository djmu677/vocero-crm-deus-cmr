"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KanbanRulesSection,
  MediaLibrarySection,
  type AgentMedia,
} from "@/components/agent/agent-client";
import type { StageDto } from "@/lib/types";
import { TelegramAlertSection } from "@/components/automation/telegram-alert-section";

export function AutomationClient() {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [mediaAssets, setMediaAssets] = useState<AgentMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [pipeline, media] = await Promise.all([
      fetch("/api/pipeline/stages").then((response) =>
        response.ok ? response.json() : null
      ),
      fetch("/api/agent/media").then((response) =>
        response.ok ? response.json() : null
      ),
    ]).catch(() => [null, null]);

    if (pipeline) setStages(pipeline.stages);
    if (media) setMediaAssets(media.assets);
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
          Define cómo avanza el agente y qué materiales puede enviar a tus clientes.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
          <TelegramAlertSection />
          <KanbanRulesSection
            stages={stages}
            onChanged={() => void refetch()}
          />
          <MediaLibrarySection
            assets={mediaAssets}
            onChanged={() => void refetch()}
          />
        </div>
      )}
    </div>
  );
}
