import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { requireBotKey, resolveInstanceOrg } from "@/server/bot/auth";
import { quoteConversationOrder } from "@/server/quotes/order";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ conversationId: z.string().min(1) });

/** Calcula y persiste una cotización usando únicamente el catálogo del tenant. */
export async function POST(req: Request) {
  const denied = requireBotKey(req);
  if (denied) return denied;
  const organizationId = await resolveInstanceOrg();
  if (!organizationId) {
    return apiError(409, "no_org", "La instancia aún no tiene organización");
  }
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  const result = await quoteConversationOrder({
    organizationId,
    conversationId: body.data.conversationId,
  });
  if (!result) return apiError(404, "not_found", "Conversación o lead no encontrado");
  if (!result.available) {
    return apiError(409, "quote_not_configured", "El cotizador no está configurado");
  }
  // Una cotización incompleta es un resultado comercial útil: NEA necesita
  // el código y el dato faltante para formular la siguiente pregunta.
  return Response.json({
    ok: result.quote.ok,
    available: true,
    quote: result.quote,
  });
}
