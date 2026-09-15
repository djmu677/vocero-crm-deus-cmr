"use client";

import { useEffect, useState } from "react";
import type { SourceValue, StageDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const SOURCES: { value: SourceValue; label: string }[] = [
  { value: "referido", label: "Referido" },
  { value: "organico", label: "Contenido orgánico" },
  { value: "conocido", label: "Conocido" },
  { value: "anuncio", label: "Anuncio" },
  { value: "otro", label: "Otro" },
];

/**
 * Alta manual de un prospecto que no llegó por WhatsApp.
 * El teléfono es obligatorio porque ES la identidad en WhatsApp: sin él, el
 * contacto no podría recibir ni mandar nada, y sería una ficha muerta.
 */
export function NewContactDialog({
  onClose,
  onCreated,
  onOpenExisting,
}: {
  onClose: () => void;
  onCreated: () => void;
  /** Duplicado: en vez de un error seco, se ofrece ir a quien ya existe. */
  onOpenExisting: (contactId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<SourceValue>("referido");
  const [notes, setNotes] = useState("");
  const [stages, setStages] = useState<StageDto[]>([]);
  const [stageId, setStageId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ id: string; name: string } | null>(
    null
  );

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/pipeline/stages").catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { stages: StageDto[] };
      const abiertas = data.stages.filter((s) => s.kind === "open");
      setStages(abiertas);
      setStageId(abiertas[0]?.id ?? "");
    })();
  }, []);

  async function guardar() {
    setSaving(true);
    setError(null);
    setDuplicado(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        source,
        notes: notes.trim() || undefined,
        stageId: stageId || undefined,
      }),
    }).catch(() => null);
    setSaving(false);

    if (!res) {
      setError("No se pudo guardar. Revisa tu conexión.");
      return;
    }
    const data = (await res.json().catch(() => null)) as {
      error?: { message?: string };
      contact?: { id: string; name: string };
    } | null;

    if (res.status === 409 && data?.contact) {
      setDuplicado({ id: data.contact.id, name: data.contact.name });
      return;
    }
    if (!res.ok) {
      setError(data?.error?.message ?? "No se pudo guardar el contacto");
      return;
    }
    onCreated();
  }

  // 11 dígitos = código de país + número. Ver la nota del endpoint sobre por
  // qué el código de país no puede faltar ni asumirse.
  const listo = name.trim().length > 0 && phone.replace(/\D/g, "").length >= 11;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nuevo contacto"
      description="Para prospectos que no llegaron por WhatsApp: referidos, gente que te escribió por otra red o conocidos."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!listo || saving || stages.length === 0}
            onClick={() => void guardar()}
          >
            {saving ? "Guardando…" : "Crear contacto"}
          </Button>
        </>
      }
    >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nc-name">Nombre</Label>
            <Input
              id="nc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ferretería La Central"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-phone">Teléfono con código de país</Label>
            <Input
              id="nc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="52 462 134 9768"
            />
            <p className="text-[11px] text-text-3">
              Escríbelo con espacios si quieres, pero{" "}
              <strong>incluye el código de país</strong> (52 para México). Sin
              él, WhatsApp no lo reconoce como la misma persona que te escriba
              después.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-source">¿De dónde salió?</Label>
              <Select
                id="nc-source"
                value={source}
                onChange={(e) => setSource(e.target.value as SourceValue)}
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-stage">Etapa inicial</Label>
              <Select
                id="nc-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-notes">Notas (opcional)</Label>
            <Textarea
              id="nc-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Me lo pasó Juan; tiene taller de motos…"
            />
          </div>
        </div>

        {duplicado && (
          <Alert variant="warning" className="mt-3">
            <AlertTitle>Contacto existente</AlertTitle>
            <AlertDescription>
              Ese teléfono ya es de <strong>{duplicado.name}</strong>. No se creó
              un duplicado.
            </AlertDescription>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => onOpenExisting(duplicado.id)}
            >
              Abrir su conversación
            </Button>
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="mt-3">
            <AlertTitle>No se pudo crear el contacto</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {stages.length === 0 && (
          <Alert variant="warning" className="mt-3">
            <AlertTitle>Falta una etapa abierta</AlertTitle>
            <AlertDescription>
              Crea una en el Pipeline antes de capturar contactos.
            </AlertDescription>
          </Alert>
        )}
    </Dialog>
  );
}
