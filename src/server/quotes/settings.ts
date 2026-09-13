import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import {
  EMPTY_QUOTE_CATALOG,
  quoteCatalogSchema,
  type QuoteCatalog,
} from "@/server/quotes/config";

export async function getQuoteCatalog(
  organizationId: string
): Promise<QuoteCatalog | null> {
  const rows = await getDb()
    .select()
    .from(schema.quoteCatalogSettings)
    .where(scoped(schema.quoteCatalogSettings.organizationId, organizationId))
    .limit(1);
  if (!rows[0]) return null;
  const parsed = quoteCatalogSchema.safeParse({
    enabled: rows[0].enabled,
    currency: rows[0].currency,
    products: rows[0].products,
    shippingRates: rows[0].shippingRates,
  });
  return parsed.success ? parsed.data : { ...EMPTY_QUOTE_CATALOG };
}

export async function saveQuoteCatalog(
  organizationId: string,
  catalog: QuoteCatalog
): Promise<void> {
  await getDb()
    .insert(schema.quoteCatalogSettings)
    .values({
      id: newId("quoteCatalogSettings"),
      organizationId,
      enabled: catalog.enabled,
      currency: catalog.currency,
      products: catalog.products,
      shippingRates: catalog.shippingRates,
    })
    .onConflictDoUpdate({
      target: [schema.quoteCatalogSettings.organizationId],
      set: {
        enabled: catalog.enabled,
        currency: catalog.currency,
        products: catalog.products,
        shippingRates: catalog.shippingRates,
        updatedAt: new Date(),
      },
    });
}

export async function deleteQuoteCatalog(organizationId: string): Promise<void> {
  await getDb()
    .delete(schema.quoteCatalogSettings)
    .where(eq(schema.quoteCatalogSettings.organizationId, organizationId));
}
