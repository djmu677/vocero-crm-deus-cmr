"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  MessageSquareText,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import type { ContactDto } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { SOURCE_LABELS } from "@/server/contact-source";
import { priorityRank } from "@/server/leads/priority";
import { PriorityBadge } from "@/components/pipeline/priority-picker";
import { NewContactDialog } from "./new-contact-dialog";
import { StartConversation } from "./start-conversation";

export function ContactsClient() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [stages, setStages] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ContactDto | null>(null);
  const [creando, setCreando] = useState(false);
  const [escribiendo, setEscribiendo] = useState<ContactDto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mismo rescate que en la Bandeja: lo tecleado antes de que hidrate el JS
  // se perdía en silencio. Ver conversation-list.tsx.
  useEffect(() => {
    const typed = inputRef.current?.value ?? "";
    if (typed) setQuery(typed);
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/pipeline/stages").catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { stages: { name: string }[] };
      setStages(data.stages.map((s) => s.name));
    })();
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stage !== "all") params.set("stage", stage);
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/contacts?${params}`).catch(() => null);
    if (!res?.ok) {
      setLoadError("No pudimos obtener los contactos. Revisa tu conexión e inténtalo nuevamente.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { contacts: ContactDto[] };
    // A quién llamar primero: alta arriba, sin prioridad al final. El orden lo
    // decide esta lista, no el servidor, porque es una preferencia de trabajo y
    // no un dato del contacto.
    setContacts(
      [...data.contacts].sort(
        (a, b) => priorityRank(a.priority ?? null) - priorityRank(b.priority ?? null)
      )
    );
    setLoading(false);
  }, [query, stage, showArchived]);

  useEffect(() => {
    const t = setTimeout(() => void refetch(), 250);
    return () => clearTimeout(t);
  }, [refetch]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    void refetch();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-bold tracking-tight">Contactos</h2>
          <Button size="sm" onClick={() => setCreando(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
            Nuevo contacto
          </Button>
        </div>
        <FilterBar>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-primary"
            />
            Ver archivados
          </label>
          {stages.length > 0 && (
            <Select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              aria-label="Filtrar por etapa del embudo"
              className="w-auto"
            >
              <option value="all">Toda etapa</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar por nombre o teléfono…"
              aria-label="Buscar contacto"
              defaultValue=""
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 sm:w-72"
            />
          </div>
        </FilterBar>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <LoadingState label="Cargando contactos…" className="h-full" />
        ) : loadError ? (
          <ErrorState
            title="No se pudieron cargar los contactos"
            description={loadError}
            onRetry={() => void refetch()}
            className="h-full"
          />
        ) : contacts.length === 0 ? (
          query.trim() || stage !== "all" ? (
            <EmptyState
              title="Sin resultados"
              description={
                <>
                  Nadie coincide con
                  {query.trim() ? ` «${query.trim()}»` : ""}
                  {query.trim() && stage !== "all" ? " en" : ""}
                  {stage !== "all" ? ` la etapa «${stage}»` : ""}.
                </>
              }
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStage("all");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Limpiar filtros
                </Button>
              }
              className="h-full"
            />
          ) : (
            <EmptyState
              title="Sin contactos"
              description="Cada persona que escriba a tu WhatsApp quedará registrada aquí automáticamente. También puedes crear un contacto manualmente."
              action={
                <Button size="sm" onClick={() => setCreando(true)}>
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                  Nuevo contacto
                </Button>
              }
              className="h-full"
            />
          )
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-3 sm:flex-nowrap sm:gap-x-4 sm:px-4"
              >
                <ContactAvatar name={c.name} seed={c.id} />
                {/* El 60% mínimo es lo que empuja los botones a su propio
                    renglón en el teléfono en vez de exprimir el nombre. */}
                <div className="min-w-[60%] flex-1 sm:min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.name}
                    </span>
                    {c.priority && <PriorityBadge value={c.priority} />}
                    {c.stageName && (
                      <Badge variant="outline">{c.stageName}</Badge>
                    )}
                    {c.archivedAt && (
                      <Badge variant="secondary">Archivado</Badge>
                    )}
                    {/* Solo la fuente que alguien capturó: presentar una
                        deducción como dato la volvería un número inventado en
                        cuanto se cuente por fuente. */}
                    {c.source?.source === "capturada" && (
                      <Badge variant="secondary">
                        {SOURCE_LABELS[c.source.value]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPhone(c.phone)}
                    {c.notes ? ` · ${c.notes.slice(0, 60)}` : ""}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(c)}
                  >
                    Editar
                  </Button>
                  {/* A quien nunca escribió hay que abrirle la conversación con
                      una plantilla: es regla de Meta, no del CRM. */}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Escribir primero"
                    title="Escribir primero (con plantilla)"
                    onClick={() => setEscribiendo(c)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Link href={`/inbox?contact=${c.id}`}>
                    <Button variant="ghost" size="icon" aria-label="Abrir conversación">
                      <MessageSquareText className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={c.archivedAt ? "Desarchivar" : "Archivar"}
                    onClick={() => void patch(c.id, { archived: !c.archivedAt })}
                  >
                    {c.archivedAt ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditDialog
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={async (patchBody) => {
            await patch(editing.id, patchBody);
            setEditing(null);
          }}
        />
      )}

      {escribiendo && (
        <Dialog
          open
          onClose={() => setEscribiendo(null)}
          title={`Escribir a ${escribiendo.name}`}
          description="Meta exige iniciar este contacto con una plantilla aprobada."
        >
            <StartConversation
              contactId={escribiendo.id}
              onStarted={() => {
                const contactId = escribiendo.id;
                setEscribiendo(null);
                // La Bandeja resuelve por CONTACTO (`?contact=`), no por
                // conversación: con `?conversation=` no seleccionaría nada.
                router.push(`/inbox?contact=${contactId}`);
              }}
            />
        </Dialog>
      )}

      {creando && (
        <NewContactDialog
          onClose={() => setCreando(false)}
          onCreated={() => {
            setCreando(false);
            void refetch();
          }}
          onOpenExisting={(contactId) => {
            setCreando(false);
            router.push(`/inbox?contact=${contactId}`);
          }}
        />
      )}
    </div>
  );
}

function EditDialog({
  contact,
  onClose,
  onSave,
}: {
  contact: ContactDto;
  onClose: () => void;
  onSave: (patch: { name: string; notes: string }) => Promise<void>;
}) {
  const [name, setName] = useState(contact.name);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Editar contacto"
      description={contact.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              await onSave({ name: name.trim(), notes });
              setSaving(false);
            }}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      }
    >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
    </Dialog>
  );
}
