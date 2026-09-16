"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type {
  ContactMetadataDefinitionsDto,
  CustomFieldType,
} from "@/lib/contact-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorState, LoadingState } from "@/components/ui/states";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Fecha",
  boolean: "Sí / No",
  select: "Lista de opciones",
};

export function ContactMetadataSettings() {
  const [definitions, setDefinitions] = useState<ContactMetadataDefinitionsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagName, setTagName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [fieldOptions, setFieldOptions] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/settings/contact-metadata").catch(() => null);
    if (!response?.ok) {
      setError("No pudimos cargar las etiquetas y campos personalizados.");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { definitions: ContactMetadataDefinitionsDto };
    setDefinitions(data.definitions);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function runAction(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/settings/contact-metadata", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!response?.ok) {
      const data = response ? ((await response.json().catch(() => null)) as { error?: { message?: string } } | null) : null;
      setError(data?.error?.message ?? "No se pudo guardar el cambio.");
      setBusy(false);
      return false;
    }
    const data = (await response.json()) as { definitions: ContactMetadataDefinitionsDto };
    setDefinitions(data.definitions);
    setBusy(false);
    return true;
  }

  async function addTag(event: FormEvent) {
    event.preventDefault();
    if (await runAction({ action: "create_tag", name: tagName })) setTagName("");
  }

  async function addField(event: FormEvent) {
    event.preventDefault();
    const options = fieldType === "select"
      ? fieldOptions.split(",").map((value) => value.trim()).filter(Boolean)
      : undefined;
    if (
      await runAction({
        action: "create_field",
        label: fieldLabel,
        type: fieldType,
        options,
      })
    ) {
      setFieldLabel("");
      setFieldType("text");
      setFieldOptions("");
    }
  }

  if (loading) return <LoadingState label="Cargando datos de clientes…" />;
  if (!definitions) {
    return <ErrorState title="No se pudo cargar" description={error ?? "Configuración no disponible."} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h3 className="text-lg font-bold">Datos de clientes</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Define etiquetas y campos reutilizables para adaptar Parley a cada negocio sin cambiar código.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h4 className="font-semibold">Etiquetas</h4>
          <p className="text-sm text-muted-foreground">Clasifica contactos con categorías compartidas por tu organización.</p>
        </div>
        <div className="space-y-4 p-4">
          <form onSubmit={addTag} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Ej. Mayorista, VIP, Postventa"
              maxLength={60}
              aria-label="Nombre de etiqueta"
            />
            <Button type="submit" disabled={busy || !tagName.trim()}>Añadir etiqueta</Button>
          </form>
          {definitions.tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay etiquetas.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {definitions.tags.map((tag) => (
                <li key={tag.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm font-medium">{tag.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Eliminar etiqueta ${tag.name}`}
                    onClick={() => void runAction({ action: "delete_tag", id: tag.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h4 className="font-semibold">Campos personalizados</h4>
          <p className="text-sm text-muted-foreground">Crea datos estructurados que luego podrán usarse en filtros, importaciones y automatizaciones.</p>
        </div>
        <div className="space-y-4 p-4">
          <form onSubmit={addField} className="grid gap-3 sm:grid-cols-2">
            <Input
              value={fieldLabel}
              onChange={(event) => setFieldLabel(event.target.value)}
              placeholder="Ej. Tipo de vivienda"
              maxLength={80}
              aria-label="Nombre del campo personalizado"
            />
            <Select
              value={fieldType}
              onChange={(event) => setFieldType(event.target.value as CustomFieldType)}
              aria-label="Tipo de campo personalizado"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            {fieldType === "select" && (
              <Input
                className="sm:col-span-2"
                value={fieldOptions}
                onChange={(event) => setFieldOptions(event.target.value)}
                placeholder="Opciones separadas por coma"
                aria-label="Opciones del campo"
              />
            )}
            <Button className="sm:col-span-2 sm:w-fit" type="submit" disabled={busy || !fieldLabel.trim()}>
              Añadir campo
            </Button>
          </form>

          {definitions.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay campos personalizados.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {definitions.fields.map((field) => (
                <li key={field.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[field.type]} · {field.key}
                      {field.type === "select" ? ` · ${field.options.join(", ")}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Eliminar campo ${field.label}`}
                    onClick={() => void runAction({ action: "delete_field", id: field.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
