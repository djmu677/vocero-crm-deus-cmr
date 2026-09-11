import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getTelegramSettings } from "@/server/telegram/settings";
import { sendTelegramMessage } from "@/server/telegram/client";

const FIELD_LABELS: Record<string, string> = {
  producto: "Producto", product: "Producto", modelo: "Modelo", model: "Modelo",
  color: "Color", tela: "Tela", cantidad: "Cantidad", quantity: "Cantidad",
  comuna: "Comuna", commune: "Comuna", medidas: "Medidas", patas: "Patas",
};

function safeValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim().slice(0, 120) || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Resumen con lista blanca: nunca incluye teléfono, dirección, email ni notas. */
export function buildOrderAlertText(input: {
  contactName: string;
  ficha: Record<string, unknown> | null;
  conversationUrl: string;
}): string {
  const details: string[] = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(input.ficha ?? {})) {
    const label = FIELD_LABELS[key.toLocaleLowerCase("es")];
    const safe = safeValue(value);
    if (!label || !safe || seen.has(label)) continue;
    seen.add(label);
    details.push(`${label}: ${safe}`);
  }
  return [
    "🛒 Nuevo pedido en Parley",
    `Cliente: ${input.contactName.trim().slice(0, 120) || "Sin nombre"}`,
    ...details,
    "",
    `Abrir conversación: ${input.conversationUrl}`,
  ].join("\n").slice(0, 3500);
}

export async function sendOrderAlert(input: {
  organizationId: string;
  leadId: string;
  contactId: string;
}): Promise<"sent" | "skipped" | "failed"> {
  try {
    const settings = await getTelegramSettings(input.organizationId);
    if (!settings?.enabled) return "skipped";

    const rows = await getDb().select({
      contactName: schema.contact.name,
      ficha: schema.contact.ficha,
    }).from(schema.lead)
      .innerJoin(schema.contact, and(
        eq(schema.contact.id, schema.lead.contactId),
        eq(schema.contact.organizationId, input.organizationId)
      ))
      .innerJoin(schema.conversation, and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.organizationId, input.organizationId),
        eq(schema.conversation.isTest, false)
      ))
      .where(and(
        eq(schema.lead.id, input.leadId),
        eq(schema.lead.contactId, input.contactId),
        eq(schema.lead.organizationId, input.organizationId)
      )).limit(1);
    const row = rows[0];
    if (!row) return "skipped";

    const base = getEnv().APP_BASE_URL.replace(/\/$/, "");
    const text = buildOrderAlertText({
      contactName: row.contactName,
      ficha: row.ficha,
      conversationUrl: `${base}/inbox?contact=${encodeURIComponent(input.contactId)}`,
    });
    await sendTelegramMessage(settings.token, settings.chatId, text);
    return "sent";
  } catch (error) {
    console.warn(`[telegram] no se pudo avisar el pedido ${input.leadId}: ${error instanceof Error ? error.message : "error desconocido"}`);
    return "failed";
  }
}
