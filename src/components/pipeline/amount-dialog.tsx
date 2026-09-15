"use client";

import { useState } from "react";
import { formatMoneyCents, parseMoneyToCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriorityPicker } from "./priority-picker";
import type { PriorityValue } from "@/lib/types";

/**
 * Monto y prioridad de un trato: los dos datos que el dueño ajusta desde el
 * tablero sin abrir nada más.
 *
 * Acepta lo que el dueño escriba —"12,500", "$12 500.50"— porque nadie teclea
 * centavos, y guarda centavos enteros. Vacío BORRA el monto: un trato sin
 * número no vale cero, simplemente no se sabe, y esa diferencia se nota en el
 * total de la columna.
 */
export function AmountDialog({
  leadName,
  currency,
  amountCents,
  priority,
  onPriorityChange,
  onCancel,
  onSave,
}: {
  leadName: string;
  currency: string;
  amountCents: number | null;
  priority: PriorityValue | null;
  /** Se guarda al instante: es un clic, no un formulario. */
  onPriorityChange: (value: PriorityValue | null) => void;
  onCancel: () => void;
  onSave: (cents: number | null) => void;
}) {
  const [texto, setTexto] = useState(
    amountCents === null ? "" : (amountCents / 100).toFixed(2)
  );
  const parsed = texto.trim() ? parseMoneyToCents(texto) : null;
  const invalido = texto.trim().length > 0 && parsed === null;

  return (
    <Dialog
      open
      onClose={onCancel}
      title="Monto y prioridad"
      description={leadName}
      className="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={invalido} onClick={() => onSave(parsed)}>
            Guardar cambios
          </Button>
        </>
      }
    >
        <Label className="block" htmlFor="monto">
          Cuánto vale este trato ({currency})
        </Label>
        <Input
          id="monto"
          value={texto}
          inputMode="decimal"
          autoFocus
          onChange={(e) => setTexto(e.target.value)}
          placeholder="12,500.00"
          className="mt-1"
        />
        {invalido ? (
          <p className="mt-1 text-xs text-danger-text">
            No reconozco ese número. Escríbelo como 12500 o 12,500.00
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-3">
            {parsed === null
              ? "Déjalo vacío para quitar el monto."
              : `Se guardará como ${formatMoneyCents(parsed, currency)}`}
          </p>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium">Prioridad</p>
          <div className="mt-1.5">
            <PriorityPicker value={priority} onChange={onPriorityChange} />
          </div>
        </div>

    </Dialog>
  );
}
