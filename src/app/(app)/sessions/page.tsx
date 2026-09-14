import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-4 sm:px-6">
        <p className="kicker">Inteligencia</p>
        <h1 className="page-title mt-1">Sesiones</h1>
        <p className="body-copy mt-1 max-w-content-narrow">
          Este módulo reunirá el seguimiento detallado de las sesiones del agente.
        </p>
      </header>

      <main className="p-4 sm:p-6">
        <Card className="max-w-content-narrow">
          <CardHeader>
            <History aria-hidden="true" className="h-6 w-6 text-brand" />
            <CardTitle className="pt-2">Módulo preparado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="body-copy">
              La navegación ya reserva un lugar estable para Sesiones. Su historial,
              filtros y métricas se incorporarán en una tarea funcional independiente.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/inbox"
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-brand-fg hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                Ver conversaciones
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/results"
                className="inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold text-text-2 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                Ver resultados
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
