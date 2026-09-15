"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  GitBranch,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  StickyNote,
  UserRoundCheck,
} from "lucide-react";
import type { Customer360Dto } from "@/lib/customer-360";
import { formatPhone } from "@/lib/utils";
import { SOURCE_LABELS } from "@/server/contact-source";
import { ContactAvatar } from "@/components/avatar";
import { PriorityBadge } from "@/components/pipeline/priority-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
} as const;

const BOOKING_STATUS = {
  agendada: "Agendada",
  realizada: "Realizada",
  no_show: "No asistió",
  cancelada: "Cancelada",
} as const;

const STAGE_SOURCE = {
  dueno: "Equipo",
  bot: "Agente",
  sistema: "Sistema",
  migracion: "Migración",
} as const;

export function Customer360Client({ contactId }: { contactId: string }) {
  const [customer, setCustomer] = useState<Customer360Dto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/contacts/${contactId}/360`).catch(() => null);
      if (!active) return;
      if (!response?.ok) {
        setError(
          response?.status === 404
            ? "Este contacto no existe o no pertenece a tu organización."
            : "No pudimos cargar la historia comercial del cliente."
        );
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { customer: Customer360Dto };
      if (!active) return;
      setCustomer(data.customer);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [contactId]);

  if (loading) return <LoadingState label="Cargando ficha del cliente…" className="h-full" />;
  if (error || !customer) {
    return (
      <ErrorState
        title="No se pudo abrir la ficha"
        description={error ?? "Contacto no disponible."}
        className="h-full"
      />
    );
  }

  const source = customer.contact.source;
  const fichaEntries = Object.entries(customer.contact.ficha ?? {});

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/contacts" aria-label="Volver a contactos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <ContactAvatar name={customer.contact.name} seed={customer.contact.id} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight">
                  {customer.contact.name}
                </h1>
                {customer.lead?.priority && <PriorityBadge value={customer.lead.priority} />}
                {customer.lead?.stage && (
                  <Badge variant="outline">{customer.lead.stage.name}</Badge>
                )}
                {customer.contact.archivedAt && <Badge variant="secondary">Archivado</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPhone(customer.contact.phone)}
              </p>
            </div>
          </div>
          <Link href={`/inbox?contact=${customer.contact.id}`}>
            <Button size="sm">
              <MessageSquareText className="h-4 w-4" />
              Abrir conversación
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 p-4 sm:p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Section title="Contacto" icon={UserRoundCheck}>
            <InfoRow label="Teléfono" value={formatPhone(customer.contact.phone) || "Sin teléfono"} />
            <InfoRow
              label="Fuente"
              value={
                source.value === "desconocida"
                  ? "Desconocida"
                  : `${SOURCE_LABELS[source.value]}${source.source === "deducida" ? " (deducida)" : ""}`
              }
            />
            <InfoRow
              label="Responsable"
              value={customer.responsible ? "Asignado" : "Sin responsable asignado"}
            />
            <InfoRow label="Creado" value={formatDate(customer.contact.createdAt)} />
            {customer.lead && (
              <>
                <InfoRow label="Etapa" value={customer.lead.stage.name} />
                <InfoRow
                  label="Negociación"
                  value={formatMoney(customer.lead.amountCents, customer.lead.currency)}
                />
              </>
            )}
          </Section>

          <Section title="Datos de la ficha" icon={FileText}>
            {fichaEntries.length === 0 ? (
              <EmptyLine text="Aún no hay datos de calificación." />
            ) : (
              <dl className="space-y-2">
                {fichaEntries.map(([key, value]) => (
                  <div key={key} className="rounded-md bg-muted/45 px-3 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {humanizeKey(key)}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm">{formatFichaValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>

          <Section title="Notas" icon={StickyNote}>
            {customer.contact.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-6">{customer.contact.notes}</p>
            ) : (
              <EmptyLine text="Sin notas registradas." />
            )}
          </Section>

          <Section title="Tareas" icon={ListChecks}>
            <EmptyLine text="Sin tareas asociadas a este cliente." />
          </Section>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Section
            title="Conversaciones"
            icon={MessageSquareText}
            count={customer.conversations.length}
          >
            {customer.conversations.length === 0 ? (
              <EmptyLine text="Sin conversaciones registradas." />
            ) : (
              <div className="space-y-2">
                {customer.conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/inbox?contact=${customer.contact.id}`}
                    className="block rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{CHANNEL_LABELS[conversation.channel]}</Badge>
                        {conversation.unreadCount > 0 && (
                          <Badge>{conversation.unreadCount} sin leer</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(conversation.lastMessageAt ?? conversation.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {conversation.preview ?? "Conversación sin mensajes visibles."}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Pipeline" icon={GitBranch} count={customer.pipelineHistory.length}>
            {customer.pipelineHistory.length === 0 ? (
              <EmptyLine text="Sin movimientos de pipeline registrados." />
            ) : (
              <ol className="space-y-3">
                {customer.pipelineHistory.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1 border-b pb-3 last:border-b-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {event.fromStageName ? `${event.fromStageName} → ` : "Entrada en "}
                          {event.toStageName}
                        </p>
                        <time className="text-xs text-muted-foreground">
                          {formatDate(event.occurredAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actorName ?? STAGE_SOURCE[event.source]}
                        {event.approximate ? " · fecha aproximada" : ""}
                        {event.lossNote ? ` · ${event.lossNote}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Pedidos" icon={PackageCheck} count={customer.orders.length}>
              {customer.orders.length === 0 ? (
                <EmptyLine text="Aún no ha entrado en Pedido." />
              ) : (
                <div className="space-y-2">
                  {customer.orders.map((order) => (
                    <div key={order.eventId} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{order.stageName}</span>
                        <Badge variant="secondary">Pedido</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(order.occurredAt)} · {formatMoney(order.amountCents, order.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Citas" icon={CalendarDays} count={customer.bookings.length}>
              {customer.bookings.length === 0 ? (
                <EmptyLine text="Sin citas registradas." />
              ) : (
                <div className="space-y-2">
                  {customer.bookings.map((booking) => (
                    <div key={booking.id} className="rounded-lg border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {booking.kind === "delivery"
                            ? "Entrega"
                            : booking.kind === "block"
                              ? "Bloqueo"
                              : "Sesión"}
                        </span>
                        <Badge variant="outline">{BOOKING_STATUS[booking.status]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(booking.scheduledAt)} · {booking.durationMinutes} min
                      </p>
                      {booking.meetingLink && (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Abrir reunión <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <Section title="Archivos" icon={FileText} count={customer.files.length}>
            {customer.files.length === 0 ? (
              <EmptyLine text="Sin archivos asociados a la conversación." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {customer.files.map((file) => {
                  const content = (
                    <div className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {file.fileName ?? file.caption ?? humanizeKey(file.kind)}
                        </span>
                        <Badge variant="secondary">{humanizeKey(file.kind)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(file.createdAt)}
                        {file.fileSize ? ` · ${formatBytes(file.fileSize)}` : ""}
                      </p>
                    </div>
                  );
                  return file.fetchStatus === "available" ? (
                    <a key={file.assetId} href={`/api/media/${file.assetId}`} target="_blank" rel="noreferrer">
                      {content}
                    </a>
                  ) : (
                    <div key={file.assetId}>{content}</div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof UserRoundCheck;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {count !== undefined && <Badge variant="secondary">{count}</Badge>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(amountCents: number | null, currency: string | null) {
  if (amountCents === null) return "Monto no registrado";
  const selectedCurrency = currency || "CLP";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: selectedCurrency,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toLocaleString("es-CL")} ${selectedCurrency}`;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanizeKey(value: string) {
  const cleaned = value.replace(/[_-]+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : value;
}

function formatFichaValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "label" in item) {
          const row = item as { label?: unknown; quantity?: unknown };
          const quantity = typeof row.quantity === "number" ? ` × ${row.quantity}` : "";
          return `${String(row.label ?? "Item")}${quantity}`;
        }
        return String(item);
      })
      .join(", ");
  }
  return JSON.stringify(value);
}
