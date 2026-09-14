import Link from "next/link";
import { ArrowRight, MessageCircle, Radio } from "lucide-react";
import { CHANNEL_LABEL, CHANNEL_ORDER, type Channel } from "@/lib/channels";
import { enabledChannels } from "@/server/channels/enabled";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const DESTINATION: Record<Channel, string> = {
  whatsapp: "/settings/whatsapp",
  instagram: "/inbox",
  messenger: "/settings/messenger",
};

export default function ChannelsPage() {
  const enabled = enabledChannels();

  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-4 sm:px-6">
        <p className="kicker">Administración</p>
        <h1 className="page-title mt-1">Canales</h1>
        <p className="body-copy mt-1 max-w-content-narrow">
          Encuentra en un solo lugar los canales disponibles y sus accesos de gestión.
        </p>
      </header>

      <main className="space-y-6 p-4 sm:p-6">
        <section aria-labelledby="channels-title">
          <h2 id="channels-title" className="section-title">
            Mensajería
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CHANNEL_ORDER.map((channel) => {
              const active = enabled.has(channel);
              return (
                <Card key={channel} className={active ? undefined : "opacity-70"}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <MessageCircle
                        aria-hidden="true"
                        className="h-5 w-5 text-brand"
                        strokeWidth={1.8}
                      />
                      <span
                        className={
                          active
                            ? "rounded-full bg-success-tint px-2 py-1 text-xs font-semibold text-success-text"
                            : "rounded-full bg-muted px-2 py-1 text-xs font-semibold text-text-3"
                        }
                      >
                        {active ? "Disponible" : "No habilitado"}
                      </span>
                    </div>
                    <CardTitle className="pt-2">{CHANNEL_LABEL[channel]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {active ? (
                      <Link
                        href={DESTINATION[channel]}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        {channel === "instagram" ? "Abrir Bandeja" : "Administrar canal"}
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    ) : (
                      <p className="caption">
                        Activa este canal en la configuración de la instancia.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Card className="max-w-content-wide">
          <CardHeader className="sm:flex-row sm:items-center">
            <Radio aria-hidden="true" className="h-5 w-5 text-brand" />
            <div className="flex-1">
              <CardTitle>Plantillas de mensajes</CardTitle>
              <p className="caption mt-1">
                Gestiona las plantillas aprobadas que utilizan los canales conectados.
              </p>
            </div>
            <Link
              href="/settings/templates"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold text-text-2 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Abrir plantillas
            </Link>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
