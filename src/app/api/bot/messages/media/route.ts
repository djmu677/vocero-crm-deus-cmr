import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { SendError, sendStoredMediaMessage } from "@/server/inbox/send";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  assetId: z.string().min(1).max(128),
});

/** Envía únicamente un recurso activo y aprobado de la biblioteca del agente. */
export async function POST(req: Request) {
  const denied = requireBotKey(req);
  if (denied) return denied;

  const organizationId = await resolveInstanceOrg();
  if (!organizationId) {
    return apiError(409, "no_org", "La instancia aún no tiene organización");
  }

  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;

  // Conserva exactamente el mismo gate del envío de texto del bot.
  const db = getDb();
  const conversations = await db
    .select({
      aiEnabled: schema.conversation.aiEnabled,
      handoffAt: schema.conversation.handoffAt,
    })
    .from(schema.conversation)
    .where(
      and(
        eq(schema.conversation.organizationId, organizationId),
        eq(schema.conversation.id, body.data.conversationId)
      )
    )
    .limit(1);
  const conversation = conversations[0];
  if (!conversation) {
    return apiError(404, "not_found", "Conversación no encontrada");
  }
  if (!conversation.aiEnabled || conversation.handoffAt) {
    return apiError(409, "ai_paused", "La IA está en pausa en esta conversación");
  }

  try {
    const result = await sendStoredMediaMessage({
      conversationId: body.data.conversationId,
      organizationId,
      assetId: body.data.assetId,
    });
    return Response.json({ messageId: result.messageId });
  } catch (error) {
    if (error instanceof SendError) {
      if (error.code === "window_closed" || error.code === "sandbox_violation") {
        return apiError(409, error.code, error.message);
      }
      if (error.code === "meta_error") {
        return apiError(422, error.code, error.message);
      }
      return apiError(502, error.code, error.message);
    }
    throw error;
  }
}
