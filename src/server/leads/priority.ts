import type { PriorityValue } from "@/lib/types";
import type { SemanticSalesStage } from "@/server/bot/stage-evidence";

/**
 * Prioridad de cierre del lead.
 *
 * El dueño puede fijarla manualmente. Cuando NEA logra una transición validada,
 * Parley la actualiza de forma determinista usando la etapa comercial; no se
 * intenta adivinar desde palabras sueltas del chat.
 */

export const PRIORITY_VALUES: readonly PriorityValue[] = ["alta", "media", "baja"];

export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function isPriority(v: unknown): v is PriorityValue {
  return typeof v === "string" && (PRIORITY_VALUES as readonly string[]).includes(v);
}

/** Orden de trabajo: alta primero, y lo que no tiene prioridad va al final. */
export const PRIORITY_RANK: Record<PriorityValue, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

/** Prioridad automática únicamente después de una transición validada de NEA. */
export function automaticPriorityForStage(
  stage: SemanticSalesStage | null
): PriorityValue | null {
  switch (stage) {
    case "conversation":
      return "baja";
    case "interested":
      return "media";
    case "order":
      return "alta";
    default:
      return null;
  }
}

export function priorityRank(value: PriorityValue | null): number {
  return value ? PRIORITY_RANK[value] : 3;
}

/**
 * Ordena por prioridad y, a igualdad, deja el orden que traía. Los leads sin
 * prioridad quedan al final: no son urgentes, pero tampoco se esconden.
 */
export function byPriority<T extends { priority: PriorityValue | null }>(
  leads: readonly T[]
): T[] {
  return [...leads].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}
