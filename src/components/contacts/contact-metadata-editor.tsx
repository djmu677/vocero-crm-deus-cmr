"use client";

import { useEffect, useMemo, useState } from "react";
import { Tags } from "lucide-react";
import type { ContactMetadataDto } from "@/lib/contact-metadata";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/states";

export function ContactMetadataEditor({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [metadata, setMetadata] = useState<ContactMetadataDto | null>(null);
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(() => tagIds.size, [tagIds]);

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/contacts/${contactId}/metadata`).catch(() => null);
    if (!response?.ok) {
      setError("No se pudieron cargar las etiquetas y campos.");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { metadata: ContactMetadataDto };
    setMetadata(data.metadata);
    setTagIds(new Set(data.metadata.tagIds));
    setValues(Object.fromEntries(data.metadata.values.map((item) => [item.fieldId, item.value])));
    setLoading(false);
  }

  useEffect(() => {
    if (open && !metadata && !loading) void load();
  }, [open, metadata, loading]);

  function toggleTag(id: string) {
    setTagIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!metadata) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/contacts/${contactId}/metadata`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tagIds: Array.from(tagIds),
        values: metadata.fields.map((field) => ({
          fieldId: field.id,
          value: values[field.id] ?? null,
        })),
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const data = response ? ((await response.json().catch(() => null)) as { error?: { message?: string } } | null) : null;
      setError(data?.error?.message ?? "No se pudieron guardar los datos.");
      setSaving(false);
      return;
    }
    const data = (await response.json()) as { metadata: ContactMetadataDto };
    setMetadata(data.metadata);
    setTagIds(new Set(data.metadata.tagIds));
    setValues(Object.fromEntries(data.metadata.values.map((item) => [item.fieldId, item.value])));
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        className="fixed bottom-4 right-4 z-30 shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Tags className="h-4 w-4" />
        Clasificar cliente{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Etiquetas y campos" className="w-[min(440px,94vw)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && <LoadingState label="Cargando datos…" />}
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && metadata && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold">Etiquetas</h3>
                {metadata.tags.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No hay etiquetas configuradas. Créelas en Configuración → Datos de clientes.</p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {metadata.tags.map((tag) => (
                      <label key={tag.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tagIds.has(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                        />
                        <span>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold">Campos personalizados</h3>
                {metadata.fields.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No hay campos personalizados configurados.</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {metadata.fields.map((field) => (
                      <label key={field.id} className="block space-y-1.5 text-sm font-medium">
                        <span>{field.label}</span>
                        {field.type === "select" ? (
                          <Select
                            value={typeof values[field.id] === "string" ? String(values[field.id]) : ""}
                            onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value || null }))}
                          >
                            <option value="">Sin dato</option>
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </Select>
                        ) : field.type === "boolean" ? (
                          <Select
                            value={values[field.id] === true ? "true" : values[field.id] === false ? "false" : ""}
                            onChange={(event) => setValues((current) => ({
                              ...current,
                              [field.id]: event.target.value === "" ? null : event.target.value === "true",
                            }))}
                          >
                            <option value="">Sin dato</option>
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </Select>
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={values[field.id] === null || values[field.id] === undefined ? "" : String(values[field.id])}
                            onChange={(event) => setValues((current) => ({
                              ...current,
                              [field.id]: field.type === "number"
                                ? event.target.value === "" ? null : Number(event.target.value)
                                : event.target.value,
                            }))}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t p-4">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={() => void save()} disabled={saving || loading || !metadata}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </footer>
      </Drawer>
    </>
  );
}
