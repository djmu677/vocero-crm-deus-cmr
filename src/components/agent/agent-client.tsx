"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StageDto } from "@/lib/types";

type Profile = {
  enabled: boolean;
  name: string;
  tone: string | null;
  instructions: string | null;
  escalationRules: string | null;
  greeting: string | null;
};

type KbEntry = {
  id: string;
  kind: "qa" | "block";
  question: string | null;
  answer: string | null;
  content: string | null;
};

type AgentMedia = {
  id: string;
  kind: "image" | "video";
  label: string;
  usage: string | null;
  caption: string | null;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  active: boolean;
};

export function AgentClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [stages, setStages] = useState<StageDto[]>([]);
  const [mediaAssets, setMediaAssets] = useState<AgentMedia[]>([]);
  const [kbSize, setKbSize] = useState<{ chars: number; warnAt: number; warning: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  const refetch = useCallback(async () => {
    const [p, kb, size, pipeline, media] = await Promise.all([
      fetch("/api/agent/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/kb").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/kb/size").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pipeline/stages").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/agent/media").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null, null, null, null]);
    if (p) {
      setProfile(p.profile);
      setAiConfigured(p.aiConfigured);
    }
    if (kb) setEntries(kb.entries);
    if (size) setKbSize(size);
    if (pipeline) setStages(pipeline.stages);
    if (media) setMediaAssets(media.assets);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  async function saveProfile(patch: Partial<Profile>) {
    await fetch("/api/agent/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void refetch();
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-[17px] font-bold tracking-tight">Agente de IA</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-primary">Guardado ✓</span>}
          <span className="text-sm text-muted-foreground">
            {profile.enabled ? "Encendido" : "Apagado"}
          </span>
          <button
            role="switch"
            aria-checked={profile.enabled}
            aria-label="Agente encendido"
            disabled={!aiConfigured}
            onClick={() => void saveProfile({ enabled: !profile.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${
              profile.enabled ? "bg-brand" : "bg-border-strong"
            }`}
          >
            {/*
              `shadow-sm` no es adorno: el pomo es blanco (`--knob`) y sobre el
              fondo encendido se perdía, así que el interruptor parecía una
              pastilla sólida sin control (#53). El de la bandeja ya la
              llevaba; este era el único del producto sin ella. Mismos tokens
              que allí, para que no vuelvan a divergir.
            */}
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-knob shadow-sm transition-transform ${
                profile.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </header>

      {!aiConfigured && (
        <div className="mx-4 mt-4 rounded-lg border border-brand-soft bg-brand-tint p-5 text-center sm:mx-6 sm:mt-6 sm:p-6">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary" />
          <p className="font-medium">Configura tu proveedor de IA para activar el agente</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Agrega <code className="rounded bg-secondary px-1">OPENROUTER_API_TOKEN</code> y{" "}
            <code className="rounded bg-secondary px-1">OPENROUTER_MODEL</code> a las variables
            de entorno de la instancia y reiníciala. Mientras tanto puedes dejar listo el
            comportamiento y el conocimiento aquí abajo.
          </p>
        </div>
      )}

      <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
        <ProfileSection profile={profile} onSave={saveProfile} />
        <KbSection entries={entries} kbSize={kbSize} onChanged={() => void refetch()} />
        <KanbanRulesSection stages={stages} onChanged={() => void refetch()} />
        <MediaLibrarySection
          assets={mediaAssets}
          onChanged={() => void refetch()}
        />
      </div>
    </div>
  );
}

function MediaLibrarySection({
  assets,
  onChanged,
}: {
  assets: AgentMedia[];
  onChanged: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [label, setLabel] = useState("");
  const [usage, setUsage] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || !label.trim() || !usage.trim()) return;
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("label", label.trim());
    form.set("usage", usage.trim());
    form.set("caption", caption.trim());
    const response = await fetch("/api/agent/media", {
      method: "POST",
      body: form,
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(payload?.error?.message ?? "No se pudo guardar el recurso");
      return;
    }
    setFile(null);
    setFileInputKey((current) => current + 1);
    setLabel("");
    setUsage("");
    setCaption("");
    onChanged();
  }

  async function setActive(asset: AgentMedia, active: boolean) {
    setUpdating(asset.id);
    setError(null);
    const response = await fetch(`/api/agent/media/${asset.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    }).catch(() => null);
    setUpdating(null);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(payload?.error?.message ?? "No se pudo actualizar el recurso");
      return;
    }
    onChanged();
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Biblioteca multimedia del agente</CardTitle>
        <CardDescription>
          Sube imágenes o videos aprobados y explica cuándo puede enviarlos
          NEA. El agente no puede inventar enlaces ni usar archivos del inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agent-media-file">Imagen o video</Label>
            <Input
              key={fileInputKey}
              id="agent-media-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Imágenes hasta 5 MB; videos hasta 16 MB.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-media-label">Nombre interno</Label>
            <Input
              id="agent-media-label"
              maxLength={120}
              placeholder="Ejemplo: Sofá Napoleón gris"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="agent-media-usage">Cuándo enviarlo</Label>
            <Textarea
              id="agent-media-usage"
              rows={3}
              maxLength={2000}
              placeholder="Ejemplo: solo cuando el cliente pregunte por el Napoleón o solicite una foto de ese modelo."
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="agent-media-caption">Pie opcional para WhatsApp</Label>
            <Input
              id="agent-media-caption"
              maxLength={1024}
              placeholder="Ejemplo: Sofá Napoleón en color gris"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button
              disabled={saving || !file || !label.trim() || !usage.trim()}
              onClick={() => void upload()}
            >
              {saving ? "Guardando…" : "Agregar a la biblioteca"}
            </Button>
          </div>
        </div>

        {assets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aún no hay recursos aprobados para el agente.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-lg border">
                <div className="aspect-video bg-secondary">
                  {asset.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${asset.id}`}
                      alt={asset.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={`/api/media/${asset.id}`}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{asset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.kind === "image" ? "Imagen" : "Video"}
                        {asset.fileSize
                          ? ` · ${(asset.fileSize / 1024 / 1024).toFixed(1)} MB`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={asset.active}
                      aria-label={`${asset.active ? "Desactivar" : "Activar"} ${asset.label}`}
                      disabled={updating === asset.id}
                      onClick={() => void setActive(asset, !asset.active)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                        asset.active ? "bg-brand" : "bg-border-strong"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-knob shadow-sm transition-transform ${
                          asset.active ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{asset.usage}</p>
                  {asset.caption && (
                    <p className="text-xs text-muted-foreground">
                      Pie: {asset.caption}
                    </p>
                  )}
                  <Badge variant={asset.active ? "secondary" : "outline"}>
                    {asset.active ? "Disponible para NEA" : "Desactivado"}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function KanbanRulesSection({
  stages,
  onChanged,
}: {
  stages: StageDto[];
  onChanged: () => void;
}) {
  const openStages = [...stages]
    .filter((stage) => stage.kind === "open")
    .sort((a, b) => a.position - b.position);
  const destinations = openStages.slice(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        stages.map((stage) => [stage.id, stage.botMoveCriteria ?? ""])
      )
    );
  }, [stages]);

  async function patchStage(stage: StageDto, patch: Partial<StageDto>) {
    setSaving(stage.id);
    setError(null);
    const response = await fetch(`/api/pipeline/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    setSaving(null);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(payload?.error?.message ?? "No se pudo guardar la regla");
      return;
    }
    onChanged();
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Decisiones del kanban</CardTitle>
        <CardDescription>
          Define a qué columnas puede mover NEA un lead y qué evidencia debe
          aparecer en la conversación. Nunca podrá retroceder ni declarar una
          venta ganada o perdida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {destinations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega al menos dos etapas abiertas al pipeline para configurar
            movimientos automáticos.
          </p>
        ) : (
          destinations.map((stage) => (
            <div key={stage.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Mover a {stage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    NEA evaluará esta regla usando la conversación actual.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={stage.botMoveEnabled}
                  aria-label={`Permitir movimiento automático a ${stage.name}`}
                  disabled={saving === stage.id}
                  onClick={() =>
                    void patchStage(stage, {
                      botMoveEnabled: !stage.botMoveEnabled,
                    })
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${
                    stage.botMoveEnabled ? "bg-brand" : "bg-border-strong"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-knob shadow-sm transition-transform ${
                      stage.botMoveEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor={`kanban-rule-${stage.id}`}>Cuándo mover aquí</Label>
                <Textarea
                  id={`kanban-rule-${stage.id}`}
                  rows={3}
                  maxLength={2000}
                  disabled={!stage.botMoveEnabled}
                  placeholder="Ejemplo: cuando pregunte por un producto concreto, confirme interés o consulte precio, colores o despacho."
                  value={drafts[stage.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [stage.id]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {(drafts[stage.id] ?? "").length.toLocaleString("es-CL")}/2.000
                </span>
                <Button
                  size="sm"
                  disabled={saving === stage.id || !stage.botMoveEnabled}
                  onClick={() =>
                    void patchStage(stage, {
                      botMoveCriteria: drafts[stage.id]?.trim() || null,
                    })
                  }
                >
                  {saving === stage.id ? "Guardando…" : "Guardar regla"}
                </Button>
              </div>
            </div>
          ))
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function ProfileSection({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => Promise<void>;
}) {
  const [form, setForm] = useState(profile);
  useEffect(() => setForm(profile), [profile]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamiento</CardTitle>
        <CardDescription>
          Cómo se presenta y actúa el agente al responder a tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Nombre del agente</Label>
          <Input
            id="agent-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-tone">Tono</Label>
          <Input
            id="agent-tone"
            placeholder="p. ej. cercano y directo, con usted"
            value={form.tone ?? ""}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-instructions">Instrucciones</Label>
          <Textarea
            id="agent-instructions"
            rows={5}
            placeholder="Qué debe y no debe hacer el agente…"
            value={form.instructions ?? ""}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-escalation">Reglas de escalado</Label>
          <Textarea
            id="agent-escalation"
            rows={3}
            placeholder="Cuándo pasar la conversación a un humano…"
            value={form.escalationRules ?? ""}
            onChange={(e) => setForm({ ...form, escalationRules: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-greeting">Saludo</Label>
          <Input
            id="agent-greeting"
            placeholder="Saludo para conversaciones nuevas"
            value={form.greeting ?? ""}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
          />
        </div>
        <Button onClick={() => void onSave(form)}>Guardar comportamiento</Button>
      </CardContent>
    </Card>
  );
}

function KbSection({
  entries,
  kbSize,
  onChanged,
}: {
  entries: KbEntry[];
  kbSize: { chars: number; warnAt: number; warning: boolean } | null;
  onChanged: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [block, setBlock] = useState("");

  async function addQa() {
    if (!question.trim() || !answer.trim()) return;
    await fetch("/api/kb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "qa", question, answer }),
    }).catch(() => null);
    setQuestion("");
    setAnswer("");
    onChanged();
  }

  async function addBlock() {
    if (!block.trim()) return;
    await fetch("/api/kb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "block", content: block }),
    }).catch(() => null);
    setBlock("");
    onChanged();
  }

  async function remove(id: string) {
    await fetch(`/api/kb/${id}`, { method: "DELETE" }).catch(() => null);
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge base</CardTitle>
            <CardDescription>
              La única fuente de verdad del agente: lo que no está aquí, no lo
              afirma.
            </CardDescription>
          </div>
          {kbSize && (
            <Badge variant={kbSize.warning ? "warning" : "secondary"}>
              {kbSize.chars.toLocaleString("es-MX")} caracteres
            </Badge>
          )}
        </div>
        {kbSize?.warning && (
          <p className="text-xs text-warning-text">
            El conocimiento se acerca al límite del contexto del modelo (v1 lo
            inyecta completo en cada turno). Considera depurar entradas.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Nueva pregunta / respuesta</p>
          <Input
            placeholder="Pregunta (p. ej. ¿Hacen envíos?)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Textarea
            placeholder="Respuesta"
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => void addQa()}
            disabled={!question.trim() || !answer.trim()}
          >
            <Plus className="h-4 w-4" /> Agregar P/R
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Nuevo bloque de texto libre</p>
          <Textarea
            placeholder="Horarios, direcciones, políticas…"
            rows={3}
            value={block}
            onChange={(e) => setBlock(e.target.value)}
          />
          <Button size="sm" onClick={() => void addBlock()} disabled={!block.trim()}>
            <Plus className="h-4 w-4" /> Agregar bloque
          </Button>
        </div>

        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2 rounded-md border p-3">
              <div className="min-w-0 flex-1 text-sm">
                {e.kind === "qa" ? (
                  <>
                    <p className="font-medium">{e.question}</p>
                    <p className="mt-0.5 text-muted-foreground">{e.answer}</p>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-muted-foreground">{e.content}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar entrada"
                onClick={() => void remove(e.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {entries.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Sin entradas todavía: agrega lo que el agente debe saber.
            </p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
