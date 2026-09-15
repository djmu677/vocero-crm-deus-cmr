"use client";

import { useState } from "react";
import { LOSS_REASON_LABEL, type LossReason } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const REASONS = Object.keys(LOSS_REASON_LABEL) as LossReason[];

/**
 * Motivo de pérdida. Se pide al ENTRAR a la etapa perdida y es
 * obligatorio: sin él el trato no se marca como perdido, ni aquí ni en la API,
 * ni en la base (hay un CHECK). Es la métrica que dice qué cambiar en la oferta
 * o en el anuncio, y solo se puede capturar en el momento en que se sabe.
 */
export function LossReasonDialog({
  leadName,
  onCancel,
  onConfirm,
}: {
  leadName: string;
  onCancel: () => void;
  onConfirm: (reason: LossReason, note: string) => void;
}) {
  const [reason, setReason] = useState<LossReason | null>(null);
  const [note, setNote] = useState("");

  return (
    <Dialog
      open
      onClose={onCancel}
      title="¿Por qué se perdió?"
      description={
        <>
          {leadName} pasa a Perdido. El motivo es lo único que después explica
          qué cambiar: sin él, la gráfica de pérdidas no dice nada.
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            onClick={() => reason && onConfirm(reason, note.trim())}
          >
            Marcar como perdido
          </Button>
        </>
      }
    >
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={
                reason === r
                  ? "w-full rounded-md border border-brand bg-brand-tint px-3 py-2 text-left text-sm font-medium"
                  : "w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-subtle"
              }
            >
              {LOSS_REASON_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="loss-note">Nota (opcional)</Label>
          <Textarea
            id="loss-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Se fue con una agencia local por la mitad del precio"
          />
        </div>
    </Dialog>
  );
}
