import { and, asc, eq, inArray, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getBranding } from "@/server/branding";
import {
  sendTelegramMessage,
  TelegramApiError,
} from "@/server/telegram/client";
import { getTelegramSettings } from "@/server/telegram/settings";

type Ficha = Record<string, unknown>;
type OrderExtra = {
  label: string;
  quantity?: number;
  unitPriceCents?: number;
  subtotalCents?: number;
};

function safeValue(value: unknown, limit = 160): string | null {
  if (typeof value === "string") return value.trim().slice(0, limit) || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function firstValue(ficha: Ficha, keys: string[]): string | null {
  for (const key of keys) {
    const value = safeValue(ficha[key]);
    if (value) return value;
  }
  return null;
}

function cents(ficha: Ficha, keys: string[]): number | null {
  for (const key of keys) {
    const value = ficha[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
      return value;
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shown(value: string | null | undefined): string {
  return escapeHtml(value?.trim() || "No informado");
}

function money(valueCents: number | null, currency: string): string {
  if (valueCents === null) return "No informado";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "CLP" ? 0 : 2,
      maximumFractionDigits: currency === "CLP" ? 0 : 2,
    }).format(valueCents / 100);
  } catch {
    return `${(valueCents / 100).toFixed(2)} ${currency}`;
  }
}

function orderNumber(leadId: string): string {
  const compact = leadId
    .replace(/^ld_/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  const padded = compact.padEnd(12, "0");
  return `PAR-${padded.slice(0, 6)}-${padded.slice(-6)}`;
}

function orderExtras(ficha: Ficha): OrderExtra[] {
  const raw = ficha.order_extras;
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const label = safeValue(item.label, 80);
      if (!label) return [];
      const quantity =
        typeof item.quantity === "number" &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0
          ? item.quantity
          : undefined;
      const unitPriceCents =
        typeof item.unit_price_cents === "number" &&
        Number.isSafeInteger(item.unit_price_cents) &&
        item.unit_price_cents >= 0
          ? item.unit_price_cents
          : undefined;
      const subtotalCents =
        typeof item.subtotal_cents === "number" &&
        Number.isSafeInteger(item.subtotal_cents) &&
        item.subtotal_cents >= 0
          ? item.subtotal_cents
          : undefined;
      return [{ label, quantity, unitPriceCents, subtotalCents }];
    })
    .slice(0, 12);
}

/** Comanda operativa enviada solo al chat privado configurado por el tenant. */
export function buildOrderAlertText(input: {
  leadId: string;
  contactName: string;
  contactPhone: string | null;
  ficha: Ficha | null;
  amountCents: number | null;
  currency: string;
  conversationUrl: string;
}): string {
  const ficha = input.ficha ?? {};
  const product = firstValue(ficha, ["product", "producto", "model", "modelo"]);
  const quantity = firstValue(ficha, [
    "quantity_confirmed",
    "quantity",
    "cantidad",
  ]);
  const material = firstValue(ficha, ["material", "tela"]);
  const color = firstValue(ficha, ["color"]);
  const variant = firstValue(ficha, ["product_variant", "variante"]);
  const configuration = firstValue(ficha, [
    "product_configuration",
    "configuracion",
  ]);
  const legs = firstValue(ficha, ["legs", "patas"]);
  const commune = firstValue(ficha, [
    "delivery_commune",
    "comuna",
    "commune",
    "geo",
  ]);
  const address = firstValue(ficha, [
    "delivery_address",
    "direccion",
    "address",
  ]);
  const recipient = firstValue(ficha, [
    "recipient_confirmed",
    "receptor",
    "recipient",
  ]);
  const email = firstValue(ficha, ["email", "correo"]);
  const basePrice = cents(ficha, ["base_price_cents", "unit_price_cents"]);
  const itemSubtotal = cents(ficha, ["item_subtotal_cents"]);
  const subtotal = cents(ficha, ["subtotal_cents"]);
  const shipping = cents(ficha, [
    "shipping_cost_cents",
    "delivery_cost_cents",
  ]);
  const total =
    cents(ficha, ["order_total_cents", "total_cents"]) ?? input.amountCents;
  const extras = orderExtras(ficha);
  const hasLegExtra = extras.some((extra) =>
    extra.label.toLocaleLowerCase("es").includes("pata")
  );
  const colorAndMaterial = color
    ? `${color}${material ? ` (${material})` : ""}`
    : material;
  const itemLines = [
    `• <b>${shown(product)}</b> ×${shown(quantity ?? "1")}`,
    `   Precio base: ${money(basePrice, input.currency)}`,
    colorAndMaterial ? `   Color: ${shown(colorAndMaterial)}` : null,
    variant ? `   Variante: ${shown(variant)}` : null,
    configuration ? `   Configuración: ${shown(configuration)}` : null,
    legs && !hasLegExtra ? `   Patas: ${shown(legs)}` : null,
    ...extras.map((extra) => {
      if (
        legs &&
        extra.label.toLocaleLowerCase("es").includes("pata") &&
        extra.subtotalCents !== undefined
      ) {
        return `   Patas: ${shown(legs)} — ${money(
          extra.subtotalCents,
          input.currency
        )}`;
      }
      const units =
        extra.quantity && extra.quantity > 1 ? `${extra.quantity} × ` : "";
      const unit =
        extra.unitPriceCents === undefined
          ? ""
          : `${money(extra.unitPriceCents, input.currency)} = `;
      const sum =
        extra.subtotalCents === undefined
          ? "No informado"
          : money(extra.subtotalCents, input.currency);
      return `   ${shown(extra.label)}: ${units}${unit}${sum}`;
    }),
    "   ─────────────────",
    `   Subtotal ítem: ${money(itemSubtotal ?? subtotal, input.currency)}`,
  ].filter((line): line is string => line !== null);

  return [
    `<b>${shown(product?.toLocaleUpperCase("es") ?? "NUEVO PEDIDO")}</b>`,
    "===============================",
    `PEDIDO N.º ${orderNumber(input.leadId)}`,
    "",
    "<b>DATOS DEL CLIENTE</b>",
    `Nombre: ${shown(input.contactName)}`,
    `Teléfono: ${shown(input.contactPhone)}`,
    `Correo: ${shown(email)}`,
    "",
    "<b>DATOS DE ENTREGA</b>",
    `Comuna: ${shown(commune)}`,
    `Dirección: ${shown(address)}`,
    `Recibe: ${shown(recipient)}`,
    "",
    "<b>RESUMEN DE PEDIDO</b>",
    ...itemLines,
    "",
    `Subtotal: ${money(subtotal ?? itemSubtotal, input.currency)}`,
    `Despacho: ${money(shipping, input.currency)}`,
    "===============================",
    `<b>TOTAL: ${money(total, input.currency)}</b>`,
    "",
    "Por favor, confirma disponibilidad y coordina la entrega.",
    `<a href="${escapeHtml(input.conversationUrl)}">Abrir conversación en Parley</a>`,
  ].join("\n");
}

type AlertRow = typeof schema.telegramOrderAlert.$inferSelect;

export const TELEGRAM_ALERT_MAX_ATTEMPTS = 6;
const TELEGRAM_ALERT_LOCK_MS = 2 * 60_000;
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export function telegramRetryDelayMs(attemptCount: number): number {
  return RETRY_DELAYS_MS[
    Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)
  ]!;
}

export function isTemporaryTelegramFailure(error: unknown): boolean {
  if (error instanceof TelegramApiError) {
    return error.status === 429 || error.status >= 500;
  }
  return true;
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : "error desconocido").slice(0, 500);
}

/** Reclama una fila con compare-and-set; dos réplicas no pueden enviarla juntas. */
async function claimTelegramAlert(id?: string): Promise<AlertRow | null> {
  const db = getDb();
  const now = new Date();
  const stale = new Date(now.getTime() - TELEGRAM_ALERT_LOCK_MS);
  const due = or(
    and(
      inArray(schema.telegramOrderAlert.status, ["pending", "retrying"]),
      lte(schema.telegramOrderAlert.nextAttemptAt, now)
    ),
    and(
      eq(schema.telegramOrderAlert.status, "sending"),
      lte(schema.telegramOrderAlert.lockedAt, stale)
    )
  );
  const candidates = await db
    .select()
    .from(schema.telegramOrderAlert)
    .where(id ? and(eq(schema.telegramOrderAlert.id, id), due) : due)
    .orderBy(asc(schema.telegramOrderAlert.nextAttemptAt))
    .limit(1);
  const candidate = candidates[0];
  if (!candidate) return null;

  const claimed = await db
    .update(schema.telegramOrderAlert)
    .set({
      status: "sending",
      attemptCount: candidate.attemptCount + 1,
      lastAttemptAt: now,
      lockedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.telegramOrderAlert.id, candidate.id),
        eq(schema.telegramOrderAlert.status, candidate.status),
        eq(schema.telegramOrderAlert.attemptCount, candidate.attemptCount)
      )
    )
    .returning();
  return claimed[0] ?? null;
}

async function markAlert(
  id: string,
  patch: Partial<typeof schema.telegramOrderAlert.$inferInsert>
): Promise<void> {
  await getDb()
    .update(schema.telegramOrderAlert)
    .set({ ...patch, lockedAt: null, updatedAt: new Date() })
    .where(eq(schema.telegramOrderAlert.id, id));
}

async function deliverClaimedAlert(alert: AlertRow): Promise<void> {
  try {
    const settings = await getTelegramSettings(alert.organizationId);
    if (!settings?.enabled) {
      await markAlert(alert.id, {
        status: "skipped",
        lastError: "Telegram no está configurado o está desactivado",
      });
      return;
    }

    const rows = await getDb()
      .select({
        contactName: schema.contact.name,
        contactPhone: schema.contact.phone,
        ficha: schema.contact.ficha,
        amountCents: schema.lead.amountCents,
        currency: schema.lead.currency,
      })
      .from(schema.lead)
      .innerJoin(
        schema.contact,
        and(
          eq(schema.contact.id, schema.lead.contactId),
          eq(schema.contact.organizationId, alert.organizationId)
        )
      )
      .innerJoin(
        schema.conversation,
        and(
          eq(schema.conversation.contactId, schema.contact.id),
          eq(schema.conversation.organizationId, alert.organizationId),
          eq(schema.conversation.isTest, false)
        )
      )
      .where(
        and(
          eq(schema.lead.id, alert.leadId),
          eq(schema.lead.contactId, alert.contactId),
          eq(schema.lead.organizationId, alert.organizationId)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      await markAlert(alert.id, {
        status: "skipped",
        lastError: "Pedido de prueba o datos del tenant no disponibles",
      });
      return;
    }

    const base = getEnv().APP_BASE_URL.replace(/\/$/, "");
    const branding = await getBranding(alert.organizationId);
    const text = buildOrderAlertText({
      leadId: alert.leadId,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      ficha: row.ficha,
      amountCents: row.amountCents,
      currency: row.currency ?? branding.currency,
      conversationUrl: `${base}/inbox?contact=${encodeURIComponent(alert.contactId)}`,
    });
    const sent = await sendTelegramMessage(
      settings.token,
      settings.chatId,
      text,
      undefined,
      { parseMode: "HTML" }
    );
    await markAlert(alert.id, {
      status: "sent",
      telegramMessageId: String(sent.message_id),
      sentAt: new Date(),
      lastError: null,
    });
  } catch (error) {
    const retry =
      isTemporaryTelegramFailure(error) &&
      alert.attemptCount < TELEGRAM_ALERT_MAX_ATTEMPTS;
    const retryDelay =
      error instanceof TelegramApiError && error.retryAfterSeconds
        ? Math.max(error.retryAfterSeconds * 1000, telegramRetryDelayMs(alert.attemptCount))
        : telegramRetryDelayMs(alert.attemptCount);
    await markAlert(alert.id, {
      status: retry ? "retrying" : "failed",
      nextAttemptAt: retry
        ? new Date(Date.now() + retryDelay)
        : alert.nextAttemptAt,
      lastError: safeError(error),
    });
    console.warn(
      `[telegram] intento ${alert.attemptCount} del pedido ${alert.leadId} ` +
        `${retry ? "se reintentará" : "falló definitivamente"}: ${safeError(error)}`
    );
  }
}

/** Intenta inmediatamente una alerta ya persistida; nunca lanza al pipeline. */
export async function processTelegramOrderAlert(id: string): Promise<void> {
  try {
    const alert = await claimTelegramAlert(id);
    if (alert) await deliverClaimedAlert(alert);
  } catch (error) {
    console.warn(`[telegram] no se pudo procesar la alerta ${id}: ${safeError(error)}`);
  }
}

/** Drena alertas vencidas; lo llama el worker de cada instancia. */
export async function processDueTelegramOrderAlerts(limit = 20): Promise<number> {
  let processed = 0;
  while (processed < limit) {
    const alert = await claimTelegramAlert();
    if (!alert) break;
    await deliverClaimedAlert(alert);
    processed += 1;
  }
  return processed;
}
