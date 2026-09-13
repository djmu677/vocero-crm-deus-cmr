import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const insertedRows: Record<string, unknown>[] = [];

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: (value: Record<string, unknown>) => {
        insertedRows.push(value);
        return { onConflictDoUpdate: () => Promise.resolve() };
      },
    }),
  }),
  schema: { quoteCatalogSettings: { organizationId: "organization_id" } },
}));

describe("configuración del cotizador por organización", () => {
  beforeEach(() => insertedRows.splice(0));

  it("guarda catálogo y tarifas dentro del tenant indicado", async () => {
    const { saveQuoteCatalog } = await import("@/server/quotes/settings");
    await saveQuoteCatalog("org_cotizador", {
      enabled: true,
      currency: "CLP",
      products: [{ id: "p1", name: "Futón", aliases: [], basePriceCents: 14_500_000, adjustments: [] }],
      shippingRates: [{ id: "s1", commune: "Lampa", aliases: [], priceCents: 1_500_000 }],
    });
    expect(insertedRows[0]).toMatchObject({
      organizationId: "org_cotizador",
      enabled: true,
      currency: "CLP",
    });
  });

  it("solo el propietario puede cambiar precios y el bot exige su clave", () => {
    const settingsRoute = readFileSync("src/app/api/settings/quotes/route.ts", "utf8");
    const botRoute = readFileSync("src/app/api/bot/quote/route.ts", "utf8");
    expect(settingsRoute).toContain('session.role !== "owner"');
    expect(botRoute).toContain("requireBotKey(req)");
    expect(botRoute).toContain("resolveInstanceOrg()");
  });
});
