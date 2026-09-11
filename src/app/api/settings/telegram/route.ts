import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getTelegramBot, getTelegramChat, TelegramApiError } from "@/server/telegram/client";
import {
  deleteTelegramSettings,
  getTelegramSettings,
  getTelegramSettingsView,
  saveTelegramSettings,
} from "@/server/telegram/settings";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) =>
  Response.json({ connection: await getTelegramSettingsView(session.organizationId) })
);

const putSchema = z.object({
  token: z.string().trim().min(20).optional(),
  chatId: z.string().trim().min(1).max(100),
  enabled: z.boolean().default(true),
});

export const PUT = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede configurar Telegram");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  const current = await getTelegramSettings(session.organizationId);
  const token = body.data.token || current?.token;
  if (!token) return apiError(422, "token_required", "Ingresa el token del bot");

  try {
    const [bot, chat] = await Promise.all([
      getTelegramBot(token),
      getTelegramChat(token, body.data.chatId),
    ]);
    await saveTelegramSettings({
      organizationId: session.organizationId,
      token,
      chatId: body.data.chatId,
      enabled: body.data.enabled ?? true,
      botUsername: bot.username ?? null,
      chatLabel: chat.title ?? chat.username ?? chat.first_name ?? null,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const unavailable = error instanceof TelegramApiError && error.status >= 500;
    return apiError(
      unavailable ? 503 : 422,
      unavailable ? "telegram_unavailable" : "telegram_invalid",
      unavailable
        ? "Telegram no está disponible; intenta de nuevo"
        : "El token o el chat no son válidos, o el bot no tiene acceso al chat"
    );
  }
});

export const DELETE = withAuth(async (session) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede desconectar Telegram");
  }
  await deleteTelegramSettings(session.organizationId);
  return Response.json({ ok: true });
});
