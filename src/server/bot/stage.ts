/** Política de movimientos del kanban solicitados por un cerebro externo. */

export type BotStage = {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
  position: number;
};

export type BotStageDecision =
  | { ok: true; target: BotStage }
  | {
      ok: false;
      reason: "stage_not_found" | "protected_stage" | "backward_stage";
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
  stages: BotStage[]
): BotStageDecision {
  const wanted = requested.trim().toLocaleLowerCase("es");
  const target = stages.find(
    (stage) => stage.name.trim().toLocaleLowerCase("es") === wanted
  );
  if (!target) return { ok: false, reason: "stage_not_found" };
  if (target.kind !== "open") {
    return { ok: false, reason: "protected_stage" };
  }
  if (target.position < current.position) {
    return { ok: false, reason: "backward_stage" };
  }
  return { ok: true, target };
}
