import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { persistQuotedFicha } from "@/server/bot/ficha";
import { calculateQuote, type QuoteResult } from "@/server/quotes/engine";
import { getQuoteCatalog } from "@/server/quotes/settings";

export type ConversationQuoteResult =
  | { available: false; reason: "not_configured" }
  | { available: true; quote: QuoteResult };

export async function quoteConversationOrder(input: {
  organizationId: string;
  conversationId: string;
}): Promise<ConversationQuoteResult | null> {
  const catalog = await getQuoteCatalog(input.organizationId);
  if (!catalog?.enabled) return { available: false, reason: "not_configured" };

  const rows = await getDb()
    .select({
      contactId: schema.contact.id,
      ficha: schema.contact.ficha,
      leadId: schema.lead.id,
    })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      and(
        eq(schema.contact.id, schema.conversation.contactId),
        eq(schema.contact.organizationId, input.organizationId)
      )
    )
    .innerJoin(
      schema.lead,
      and(
        eq(schema.lead.contactId, schema.contact.id),
        eq(schema.lead.organizationId, input.organizationId)
      )
    )
    .where(
      and(
        eq(schema.conversation.id, input.conversationId),
        eq(schema.conversation.organizationId, input.organizationId)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const ficha = (row.ficha as Record<string, unknown> | null) ?? {};
  const quote = calculateQuote(catalog, ficha);
  if (!quote.ok) return { available: true, quote };

  const pricedFicha = {
    ...ficha,
    product: quote.product,
    quantity_confirmed: String(quote.quantity),
    base_price_cents: quote.basePriceCents,
    item_subtotal_cents: quote.itemSubtotalCents,
    subtotal_cents: quote.subtotalCents,
    shipping_cost_cents: quote.shippingCents,
    order_total_cents: quote.totalCents,
    quote_currency: quote.currency,
    quote_status: "calculated",
    quote_applied: quote.applied.join(", "),
    order_extras: quote.extras,
  };

  await persistQuotedFicha({
    organizationId: input.organizationId,
    contactId: row.contactId,
    leadId: row.leadId,
    ficha: pricedFicha,
    totalCents: quote.totalCents,
    currency: quote.currency,
  });
  return { available: true, quote };
}
