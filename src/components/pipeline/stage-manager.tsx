"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Gestión de etapas: renombrar, reordenar, agregar, eliminar (con reasignación). */
export function StageManager({
  stages,
  onClose,
  onChanged,
}: {
  stages: StageDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<StageDto | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function rename(stage: StageDto, name: string) {
    if (!name.trim() || name === stage.name) return;
    await fetch(`/api/pipeline/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => null);
    onChanged();
  }

  async function move(stage: StageDto, dir: -1 | 1) {
    const sorted = [...stages].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      fetch(`/api/pipeline/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position: swap.position }),
      }),
      fetch(`/api/pipeline/stages/${swap.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position: stage.position }),
      }),
    ]).catch(() => null);
    onChanged();
  }

  async function add() {
    if (!newName.trim()) return;
    await fetch("/api/pipeline/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    }).catch(() => null);
    setNewName("");
    onChanged();
  }

  async function remove(stage: StageDto, moveToId: string | null) {
    setError(null);
    const url = moveToId
      ? `/api/pipeline/stages/${stage.id}?moveTo=${moveToId}`
      : `/api/pipeline/stages/${stage.id}`;
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (!res) return;
    if (res.status === 409) {
      const data = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      if (data?.error?.code === "stage_has_leads") {
        setDeleting(stage);
        return;
      }
      setError(data?.error?.message ?? "No se pudo eliminar");
      return;
    }
    setDeleting(null);
    setMoveTo("");
    onChanged();
  }

  const sorted = [...stages].sort((a, b) => a.position - b.position);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Etapas del pipeline"
      description="Renombra, ordena o agrega etapas sin salir del tablero."
      className="max-w-lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
        <ul className="space-y-2">
          {sorted.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <Input
                defaultValue={s.name}
                onBlur={(e) => void rename(s, e.target.value)}
                className="flex-1"
              />
              {s.kind !== "open" ? (
                <Badge variant={s.kind === "won" ? "success" : "secondary"}>
                  {s.kind === "won" ? "ganado" : "perdido"}
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar etapa"
                  onClick={() => void remove(s, null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={i === 0}
                aria-label="Subir"
                onClick={() => void move(s, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={i === sorted.length - 1}
                aria-label="Bajar"
                onClick={() => void move(s, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        {deleting && (
          <Alert variant="warning" className="mt-4">
            <AlertTitle>La etapa contiene tarjetas</AlertTitle>
            <AlertDescription>
              &quot;{deleting.name}&quot; tiene tarjetas. Elige a dónde moverlas:
            </AlertDescription>
            <div className="mt-2 flex gap-2">
              <Select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                aria-label="Etapa de destino"
                className="flex-1"
              >
                <option value="">Etapa destino…</option>
                {sorted
                  .filter((s) => s.id !== deleting.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </Select>
              <Button
                variant="destructive"
                size="sm"
                disabled={!moveTo}
                onClick={() => void remove(deleting, moveTo)}
              >
                Mover y eliminar
              </Button>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mt-3">
            <AlertTitle>No se pudo eliminar la etapa</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex gap-2 border-t pt-4">
          <Input
            placeholder="Nueva etapa…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Button onClick={() => void add()} disabled={!newName.trim()}>
            Agregar
          </Button>
        </div>

    </Dialog>
  );
}
