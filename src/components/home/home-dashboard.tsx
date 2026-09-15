import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyCents } from "@/lib/money";
import type { HomeSummary } from "@/server/home/summary";

function formatWhen(value: string, nowIso: string): string {
  const date = new Date(value);
  const now = new Date(nowIso);
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 1) return "Ahora";
  if (minutes > 0 && minutes < 60) return `En ${minutes} min`;
  if (minutes < 0 && minutes > -60) return `Hace ${Math.abs(minutes)} min`;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone = "normal",
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  icon: typeof Inbox;
  tone?: "normal" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    normal: "bg-brand-tint text-brand-text",
    warning: "bg-warning-tint text-warning-text",
    danger: "bg-danger-tint text-danger-text",
    success: "bg-success-tint text-success-text",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Card className="h-full transition-[border-color,transform,box-shadow] group-hover:-translate-y-0.5 group-hover:border-brand-soft group-hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-4">
          <span className={`rounded-md p-2 ${toneClass}`}>
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-text-3">{label}</span>
            <span className="mt-0.5 block text-2xl font-bold tracking-tight">{value}</span>
            <span className="mt-1 block text-xs leading-4 text-text-3">{detail}</span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="mt-1 h-4 w-4 text-text-3 transition-transform group-hover:translate-x-0.5"
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-text-3">
      {children}
    </div>
  );
}

export function HomeDashboard({
  summary,
  currency,
  agenda,
}: {
  summary: HomeSummary;
  currency: string;
  agenda: boolean;
}) {
  const attentionCount =
    summary.counts.pendingConversations +
    summary.counts.highPriorityLeads +
    summary.counts.failures;
  const latestResult = summary.latestResult;
  const resultValue = latestResult
    ? latestResult.status === "done" && latestResult.score !== null
      ? `${latestResult.score}/100`
      : latestResult.status === "running"
        ? "En curso"
        : "Falló"
    : "Sin prueba";

  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-4 sm:px-6">
        <p className="kicker">Resumen operativo</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Lo importante de hoy</h1>
            <p className="body-copy mt-1 max-w-content-narrow">
              Empieza por lo que requiere atención y después revisa la actividad reciente.
            </p>
          </div>
          <span className="caption flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            Actualizado {formatWhen(summary.generatedAt, summary.generatedAt).toLowerCase()}
          </span>
        </div>
      </header>

      <main className="space-y-6 p-4 sm:p-6">
        {attentionCount === 0 ? (
          <Alert variant="success">
            <CheckCircle2 />
            <div>
              <AlertTitle>Todo bajo control</AlertTitle>
              <AlertDescription>
                No hay conversaciones pendientes, prioridades altas ni fallos recientes.
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Alert variant={summary.counts.failures > 0 ? "danger" : "warning"}>
            <AlertTriangle />
            <div>
              <AlertTitle>{attentionCount} asuntos necesitan revisión</AlertTitle>
              <AlertDescription>
                Abre las tarjetas y listas inferiores para atender primero lo urgente.
              </AlertDescription>
            </div>
          </Alert>
        )}

        <section aria-labelledby="today-metrics">
          <h2 id="today-metrics" className="sr-only">Indicadores esenciales</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Pendientes"
              value={summary.counts.pendingConversations}
              detail={`${summary.counts.unreadMessages} mensajes sin leer`}
              href="/inbox"
              icon={Inbox}
              tone={summary.counts.pendingConversations > 0 ? "warning" : "success"}
            />
            <MetricCard
              label="Prioridad alta"
              value={summary.counts.highPriorityLeads}
              detail="Tratos abiertos"
              href="/pipeline"
              icon={Star}
              tone={summary.counts.highPriorityLeads > 0 ? "warning" : "success"}
            />
            <MetricCard
              label="Pedidos nuevos"
              value={summary.counts.newOrders}
              detail="Últimas 24 horas"
              href="/pipeline"
              icon={ShoppingBag}
              tone={summary.counts.newOrders > 0 ? "success" : "normal"}
            />
            <MetricCard
              label="Agenda"
              value={agenda ? summary.counts.upcomingBookings : "Inactiva"}
              detail={agenda ? "Próximas 24 horas" : "No disponible en esta instancia"}
              href={agenda ? "/bookings" : "/settings/branding"}
              icon={CalendarDays}
            />
            <MetricCard
              label="Fallos"
              value={summary.counts.failures}
              detail="Últimas 24 horas"
              href={summary.issues[0]?.href ?? "/results"}
              icon={AlertTriangle}
              tone={summary.counts.failures > 0 ? "danger" : "success"}
            />
            <MetricCard
              label="Última prueba"
              value={resultValue}
              detail={latestResult ? formatWhen(latestResult.startedAt, summary.generatedAt) : "Ejecuta una en Resultados"}
              href="/results"
              icon={BarChart3}
              tone={latestResult?.status === "failed" ? "danger" : "normal"}
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <p className="kicker">Atención inmediata</p>
                <CardTitle className="mt-1">Conversaciones pendientes</CardTitle>
              </div>
              <Link href="/inbox" className="text-sm font-semibold text-brand-text hover:underline">
                Ver Bandeja
              </Link>
            </CardHeader>
            <CardContent>
              {summary.pendingConversations.length === 0 ? (
                <EmptyLine>No hay conversaciones esperando respuesta.</EmptyLine>
              ) : (
                <ul className="divide-y">
                  {summary.pendingConversations.map((conversation) => (
                    <li key={conversation.id}>
                      <Link
                        href={`/inbox?contact=${conversation.contact.id}`}
                        className="flex items-center gap-3 rounded-md px-1 py-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {conversation.contact.name}
                          </span>
                          <span className="block truncate text-xs text-text-3">
                            {conversation.handoffAt ? "Atención humana" : conversation.preview || "Mensaje pendiente"}
                          </span>
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="warning">{conversation.unreadCount} sin leer</Badge>
                        )}
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-text-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <p className="kicker">Orden de trabajo</p>
                <CardTitle className="mt-1">Prioridad alta</CardTitle>
              </div>
              <Link href="/pipeline" className="text-sm font-semibold text-brand-text hover:underline">
                Ver Pipeline
              </Link>
            </CardHeader>
            <CardContent>
              {summary.priorityLeads.length === 0 ? (
                <EmptyLine>No hay tratos abiertos con prioridad alta.</EmptyLine>
              ) : (
                <ul className="divide-y">
                  {summary.priorityLeads.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={lead.conversationId ? `/inbox?contact=${lead.contactId}` : "/pipeline"}
                        className="flex items-center gap-3 rounded-md px-1 py-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{lead.contactName}</span>
                          <span className="block text-xs text-text-3">{lead.stageName}</span>
                        </span>
                        <span className="text-right">
                          <Badge variant="warning">Alta</Badge>
                          {formatMoneyCents(lead.amountCents, lead.currency ?? currency, "es-CL") && (
                            <span className="mt-1 block text-xs font-semibold">
                              {formatMoneyCents(lead.amountCents, lead.currency ?? currency, "es-CL")}
                            </span>
                          )}
                        </span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-text-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <p className="kicker">Actividad comercial</p>
                <CardTitle className="mt-1">Pedidos nuevos</CardTitle>
              </div>
              <ShoppingBag aria-hidden="true" className="h-5 w-5 text-brand" />
            </CardHeader>
            <CardContent>
              {summary.newOrders.length === 0 ? (
                <EmptyLine>No entraron pedidos durante las últimas 24 horas.</EmptyLine>
              ) : (
                <ul className="divide-y">
                  {summary.newOrders.map((order) => (
                    <li key={order.eventId} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{order.contactName}</span>
                        <span className="block text-xs text-text-3">
                          {order.stageName} · {formatWhen(order.occurredAt, summary.generatedAt)}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">
                        {formatMoneyCents(order.amountCents, order.currency ?? currency, "es-CL") ?? "Monto pendiente"}
                      </span>
                      <Link
                        href={order.conversationId ? `/inbox?contact=${order.contactId}` : "/pipeline"}
                        aria-label={`Abrir pedido de ${order.contactName}`}
                        className="rounded-md p-2 text-brand-text hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <p className="kicker">Próximamente</p>
                <CardTitle className="mt-1">Citas y entregas</CardTitle>
              </div>
              <CalendarDays aria-hidden="true" className="h-5 w-5 text-brand" />
            </CardHeader>
            <CardContent>
              {!agenda ? (
                <EmptyLine>La Agenda no está activa en esta instancia.</EmptyLine>
              ) : summary.upcomingBookings.length === 0 ? (
                <EmptyLine>No hay citas o entregas próximas.</EmptyLine>
              ) : (
                <ul className="divide-y">
                  {summary.upcomingBookings.map((booking) => (
                    <li key={booking.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{booking.contactName}</span>
                        <span className="block text-xs text-text-3">
                          {booking.kind === "delivery" ? "Entrega" : "Cita"} · {formatWhen(booking.scheduledAt, summary.generatedAt)}
                        </span>
                      </span>
                      {booking.linkPending && <Badge variant="warning">Enlace pendiente</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <p className="kicker">Salud operativa</p>
                <CardTitle className="mt-1">Fallos recientes</CardTitle>
              </div>
              <CircleDollarSign aria-hidden="true" className="h-5 w-5 text-brand" />
            </CardHeader>
            <CardContent>
              {summary.issues.length === 0 ? (
                <EmptyLine>No se detectaron fallos en las últimas 24 horas.</EmptyLine>
              ) : (
                <ul className="divide-y">
                  {summary.issues.map((issue) => (
                    <li key={issue.id}>
                      <Link
                        href={issue.href}
                        className="flex items-center gap-3 rounded-md px-1 py-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1 text-sm font-semibold">{issue.label}</span>
                        <Badge variant="destructive">{issue.count}</Badge>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-text-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
