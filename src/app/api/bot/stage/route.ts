import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { resolveBotStage, type BotStage } from "@/server/bot/stage";
import { publish } from "@/server/events/bus";
import { moveLeadToStage } from "@/server/leads/stage-history";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  stage: z.string().trim().min(1).max(100),
});

/**
 * Avanza un lead a una etapa ABIERTA del kanban desde un cerebro externo.
 * POST /api/bot/stage { conversationId, stage }
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
    })
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const decision = resolveBotStage(
    body.data.stage,
    current.stage as BotStage,
    stages as BotStage[]
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
    extra: { lastActivityAt: new Date() },
  });
  if (!result.ok) {
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
  });
}
