"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MediaLibrarySection,
  type AgentMedia,
} from "@/components/agent/agent-client";
import { ErrorState, LoadingState } from "@/components/ui/states";

export function MediaLibraryClient() {
  const [assets, setAssets] = useState<AgentMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const payload = await fetch("/api/agent/media")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    if (payload) setAssets(payload.assets);
    else setError("No pudimos obtener los archivos aprobados. Revisa tu conexión e inténtalo nuevamente.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-[17px] font-bold tracking-tight">
          Biblioteca multimedia
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra las imágenes y videos aprobados que NEA puede enviar a tus
          clientes.
        </p>
      </header>

      {loading ? (
        <div className="p-4 sm:p-6">
          <LoadingState label="Cargando biblioteca multimedia…" />
        </div>
      ) : error ? (
        <div className="p-4 sm:p-6">
          <ErrorState
            title="No se pudo cargar la biblioteca"
            description={error}
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          <MediaLibrarySection
            assets={assets}
            onChanged={() => void refetch()}
          />
        </div>
      )}
    </div>
  );
}
