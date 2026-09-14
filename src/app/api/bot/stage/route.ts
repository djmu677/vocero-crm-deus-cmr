import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { resolveBotStage, type BotStage } from "@/server/bot/stage";
import { COMMERCIAL_EVIDENCE_KEYS } from "@/server/bot/stage-evidence";
import { publish } from "@/server/events/bus";
import { moveLeadToStage } from "@/server/leads/stage-history";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  stage: z.string().trim().min(1).max(100),
  // Opcional en el shape para que un NEA anterior reciba un rechazo comercial
  // explicable (409) en vez de romper el contrato HTTP con un 422.
  evidence: z.array(z.enum(COMMERCIAL_EVIDENCE_KEYS)).max(32).default([]),
});

/**
 * Avanza un lead a una etapa ABIERTA del kanban desde un cerebro externo.
 * POST /api/bot/stage { conversationId, stage, evidence[] }
 */
export async function POST(req: Request) {
  const denied = requireBotKey(req);
  if (denied) return denied;

  const organizationId = await resolveInstanceOrg();
  if (!organizationId) {
    return apiError(409, "no_org", "La instancia aún no tiene organización");
  }

  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const currentRows = await db
    .select({ lead: schema.lead, stage: schema.pipelineStage })
    .from(schema.conversation)
    .innerJoin(
      schema.lead,
      and(
        eq(schema.lead.organizationId, schema.conversation.organizationId),
        eq(schema.lead.contactId, schema.conversation.contactId)
      )
    )
    .innerJoin(
      schema.pipelineStage,
      eq(schema.pipelineStage.id, schema.lead.stageId)
    )
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        eq(schema.conversation.id, body.data.conversationId)
      )
    )
    .limit(1);

  const current = currentRows[0];
  if (!current) {
    return apiError(404, "not_found", "Conversación o lead no encontrado");
  }

  const stages = await db
    .select({
      id: schema.pipelineStage.id,
      name: schema.pipelineStage.name,
      kind: schema.pipelineStage.kind,
      position: schema.pipelineStage.position,
      botMoveEnabled: schema.pipelineStage.botMoveEnabled,
      botMoveCriteria: schema.pipelineStage.botMoveCriteria,
      botStageKey: schema.pipelineStage.botStageKey,
    })
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const decision = resolveBotStage(
    body.data.stage,
    current.stage as BotStage,
    stages as BotStage[],
    body.data.evidence
  );
  if (!decision.ok) {
    if (decision.reason === "stage_not_found") {
      return apiError(422, "invalid_stage", "Etapa inexistente");
    }
    if (decision.reason === "protected_stage") {
      return apiError(
        409,
        "protected_stage",
        "El bot no puede declarar un lead ganado o perdido"
      );
    }
    if (decision.reason === "stage_automation_disabled") {
      return apiError(
        409,
        "stage_automation_disabled",
        "El movimiento automatico a esta etapa esta desactivado"
      );
    }
    if (decision.reason === "stage_skip") {
      return apiError(
        409,
        "stage_skip",
        "El bot solo puede avanzar a la siguiente etapa del pipeline"
      );
    }
    if (decision.reason === "stage_rule_missing") {
      return apiError(
        409,
        "stage_rule_missing",
        "La etapa no tiene una regla estructurada que el servidor pueda validar"
      );
    }
    if (decision.reason === "insufficient_evidence") {
      return Response.json(
        {
          error: {
            code: "insufficient_evidence",
            message: "Falta evidencia comercial para avanzar el lead",
            missingEvidence: decision.missingEvidence ?? [],
            blockerCodes: decision.blockerCodes ?? [],
          },
        },
        { status: 409 }
      );
    }
    return apiError(
      409,
      "backward_stage",
      "El bot no puede retroceder un lead en el pipeline"
    );
  }

  const result = await moveLeadToStage({
    organizationId,
    leadId: current.lead.id,
    toStageId: decision.target.id,
    source: "bot",
    expectedFromStageId: current.stage.id,
    extra: { lastActivityAt: new Date() },
  });
  if (!result.ok) {
    if (result.reason === "stage_changed") {
      return apiError(
        409,
        "stage_changed",
        "La etapa cambió durante la validación; vuelve a consultar el contexto"
      );
    }
    return apiError(409, result.reason, "No se pudo mover el lead");
  }

  publish(organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: body.data.conversationId } },
  });

  return Response.json({
    ok: true,
    stageMoved: result.changed,
    lead: { id: result.lead.id, stageName: decision.target.name },
    evidence: decision.evidence,
  });
}
