import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/server/quotes/engine";
import { quoteCatalogSchema, type QuoteCatalog } from "@/server/quotes/config";

const catalog: QuoteCatalog = {
  enabled: true,
  currency: "CLP",
  products: [
    {
      id: "futon",
      name: "Futón Globo",
      aliases: ["futon", "futón"],
      basePriceCents: 14_500_000,
      adjustments: [
        { id: "brazos", label: "Brazos", field: "product_configuration", matches: ["con brazos"], priceCents: 2_000_000 },
        { id: "madera", label: "Patas de madera", field: "legs", matches: ["madera", "patas de madera"], priceCents: 1_000_000 },
        { id: "puff", label: "Puff adicional", field: "order_extras", matches: ["puff", "puff adicional"], priceCents: 1_000_000 },
      ],
    },
  ],
  shippingRates: [
    { id: "lampa", commune: "Lampa", aliases: [], priceCents: 1_500_000 },
  ],
};

describe("cotizador determinista", () => {
  it("calcula base, configuración, extras, despacho y total sin usar importes del bot", () => {
    expect(calculateQuote(catalog, {
      product: "futon",
      quantity_confirmed: "1",
      product_configuration: "con brazos",
      legs: "madera",
      order_extras: [{ label: "puff", quantity: 2 }],
      delivery_commune: "lampa",
      order_total_cents: 1,
    })).toEqual({
      ok: true,
      currency: "CLP",
      product: "Futón Globo",
      quantity: 1,
      basePriceCents: 14_500_000,
      adjustmentsCents: 5_000_000,
      itemSubtotalCents: 19_500_000,
      subtotalCents: 19_500_000,
      shippingCents: 1_500_000,
      totalCents: 21_000_000,
      extras: [{ label: "Puff adicional", quantity: 2, unit_price_cents: 1_000_000, subtotal_cents: 2_000_000 }],
      applied: ["Brazos", "Patas de madera", "Puff adicional"],
    });
  });

  it("tolera acentos y mayúsculas en nombres configurados", () => {
    const result = calculateQuote(catalog, {
      product: "FUTÓN",
      quantity_confirmed: 1,
      product_configuration: "con brazos",
      legs: "madera",
      delivery_commune: "LÁMPA",
    });
    expect(result.ok && result.totalCents).toBe(19_000_000);
  });

  it("rechaza producto, comuna, opción o adicional desconocidos", () => {
    expect(calculateQuote(catalog, { product: "Catalina", delivery_commune: "Lampa" })).toMatchObject({ ok: false, code: "product_not_found" });
    expect(calculateQuote(catalog, { product: "Futón", delivery_commune: "Buin" })).toMatchObject({ ok: false, code: "commune_not_found" });
    expect(calculateQuote(catalog, { product: "Futón", delivery_commune: "Lampa" })).toMatchObject({ ok: false, code: "option_required" });
    expect(calculateQuote(catalog, { product: "Futón", delivery_commune: "Lampa", product_configuration: "con brazos", legs: "metal" })).toMatchObject({ ok: false, code: "option_not_found" });
    expect(calculateQuote(catalog, { product: "Futón", delivery_commune: "Lampa", product_configuration: "con brazos", legs: "madera", order_extras: [{ label: "Mesa", quantity: 1 }] })).toMatchObject({ ok: false, code: "extra_not_found" });
  });

  it("rechaza aliases ambiguos antes de guardar el catálogo", () => {
    const duplicated = structuredClone(catalog);
    duplicated.products.push({ ...structuredClone(catalog.products[0]!), id: "otro" });
    expect(quoteCatalogSchema.safeParse(duplicated).success).toBe(false);
  });
});
