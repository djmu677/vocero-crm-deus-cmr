import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getBranding } from "@/server/branding";
import { sendTelegramMessage } from "@/server/telegram/client";
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

export async function sendOrderAlert(input: {
  organizationId: string;
  leadId: string;
  contactId: string;
}): Promise<"sent" | "skipped" | "failed"> {
  try {
    const settings = await getTelegramSettings(input.organizationId);
    if (!settings?.enabled) return "skipped";

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
          eq(schema.contact.organizationId, input.organizationId)
        )
      )
      .innerJoin(
        schema.conversation,
        and(
          eq(schema.conversation.contactId, schema.contact.id),
          eq(schema.conversation.organizationId, input.organizationId),
          eq(schema.conversation.isTest, false)
        )
      )
      .where(
        and(
          eq(schema.lead.id, input.leadId),
          eq(schema.lead.contactId, input.contactId),
          eq(schema.lead.organizationId, input.organizationId)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) return "skipped";

    const base = getEnv().APP_BASE_URL.replace(/\/$/, "");
    const branding = await getBranding(input.organizationId);
    const text = buildOrderAlertText({
      leadId: input.leadId,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      ficha: row.ficha,
      amountCents: row.amountCents,
      currency: row.currency ?? branding.currency,
      conversationUrl: `${base}/inbox?contact=${encodeURIComponent(input.contactId)}`,
    });
    await sendTelegramMessage(
      settings.token,
      settings.chatId,
      text,
      undefined,
      { parseMode: "HTML" }
    );
    return "sent";
  } catch (error) {
    console.warn(
      `[telegram] no se pudo avisar el pedido ${input.leadId}: ${
        error instanceof Error ? error.message : "error desconocido"
      }`
    );
    return "failed";
  }
}
