import { apiError, withAuth } from "@/lib/api";
import { sendTelegramMessage } from "@/server/telegram/client";
import { getTelegramSettings } from "@/server/telegram/settings";

export const POST = withAuth(async (session) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede probar Telegram");
  }
  const settings = await getTelegramSettings(session.organizationId);
  if (!settings) return apiError(409, "not_connected", "Configura Telegram primero");
  try {
    await sendTelegramMessage(
      settings.token,
      settings.chatId,
      "✅ Prueba de Parley: las alertas de pedidos están conectadas."
    );
    return Response.json({ ok: true });
  } catch {
    return apiError(502, "telegram_send_failed", "Telegram rechazó el mensaje de prueba");
  }
});
