import {
  validateStageEvidence,
  type CommercialEvidenceKey,
  semanticStageForName,
  type SemanticSalesStage,
  type StageBlockerCode,
} from "@/server/bot/stage-evidence";

/** Política de movimientos del kanban solicitados por un cerebro externo. */

export type BotStage = {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
  position: number;
  botMoveEnabled?: boolean;
  botMoveCriteria?: string | null;
  botStageKey?: SemanticSalesStage | null;
};

export type BotStageDecision =
  | { ok: true; target: BotStage; evidence: CommercialEvidenceKey[] }
  | {
      ok: false;
      reason:
        | "stage_not_found"
        | "protected_stage"
        | "backward_stage"
        | "stage_automation_disabled"
        | "stage_skip"
        | "stage_rule_missing"
        | "insufficient_evidence";
      missingEvidence?: CommercialEvidenceKey[];
      blockerCodes?: StageBlockerCode[];
    };

/**
 * Resuelve una etapa por nombre y aplica los límites de seguridad del bot.
 *
 * El cerebro puede hacer avanzar el trabajo comercial entre columnas abiertas,
 * pero no declarar una venta ganada/perdida ni retroceder el historial. Esas
 * decisiones siguen siendo del dueño o de una automatización verificable.
 */
export function resolveBotStage(
  requested: string,
  current: BotStage,
  stages: BotStage[],
  evidence: readonly CommercialEvidenceKey[] = []
): BotStageDecision {
  const wanted = requested.trim().toLocaleLowerCase("es");
  const target = stages.find(
    (stage) => stage.name.trim().toLocaleLowerCase("es") === wanted
  );
  if (!target) return { ok: false, reason: "stage_not_found" };
  if (target.kind !== "open") {
    return { ok: false, reason: "protected_stage" };
  }
  if (target.botMoveEnabled === false) {
    return { ok: false, reason: "stage_automation_disabled" };
  }
  if (target.position < current.position) {
    return { ok: false, reason: "backward_stage" };
  }

  // Repetir la etapa actual es una operación idempotente, no un avance. No
  // exige volver a demostrar evidencia y la puerta de escritura no crea evento.
  if (target.id === current.id) return { ok: true, target, evidence: [] };

  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const currentIndex = ordered.findIndex((stage) => stage.id === current.id);
  const targetIndex = ordered.findIndex((stage) => stage.id === target.id);
  if (currentIndex < 0 || targetIndex !== currentIndex + 1) {
    return { ok: false, reason: "stage_skip" };
  }

  // `botStageKey` sobrevive a renombres. El fallback por nombre permite
  // validar fixtures y filas creadas antes de aplicar la migración de P03.
  const semanticStage = target.botStageKey ?? semanticStageForName(target.name);
  const evidenceDecision = validateStageEvidence(semanticStage, evidence);
  if (!evidenceDecision.ok) {
    return {
      ok: false,
      reason: evidenceDecision.reason,
      missingEvidence: evidenceDecision.missingEvidence,
      blockerCodes: evidenceDecision.blockerCodes,
    };
  }
  return { ok: true, target, evidence: [...new Set(evidence)] };
}
