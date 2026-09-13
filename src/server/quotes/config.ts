import { z } from "zod";

export const QUOTE_FIELDS = [
  "product_variant",
  "product_configuration",
  "material",
  "color",
  "legs",
  "order_extras",
] as const;

export const quoteAdjustmentSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  field: z.enum(QUOTE_FIELDS),
  matches: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  priceCents: z.number().int().min(0).max(1_000_000_000_00),
});

export const quoteProductSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  aliases: z.array(z.string().trim().min(1).max(120)).max(30),
  basePriceCents: z.number().int().min(0).max(1_000_000_000_00),
  adjustments: z.array(quoteAdjustmentSchema).max(100),
});

export const shippingRateSchema = z.object({
  id: z.string().trim().min(1).max(80),
  commune: z.string().trim().min(1).max(120),
  aliases: z.array(z.string().trim().min(1).max(120)).max(30),
  priceCents: z.number().int().min(0).max(1_000_000_000_00),
});

export const quoteCatalogSchema = z.object({
  enabled: z.boolean(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  products: z.array(quoteProductSchema).max(500),
  shippingRates: z.array(shippingRateSchema).max(500),
}).superRefine((catalog, ctx) => {
  const canonical = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const productNames = new Set<string>();
  for (const [productIndex, product] of catalog.products.entries()) {
    for (const name of [product.name, ...product.aliases]) {
      const key = canonical(name);
      if (productNames.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["products", productIndex], message: `Nombre o alias de producto duplicado: ${name}` });
      productNames.add(key);
    }
    const optionNames = new Set<string>();
    for (const [ruleIndex, rule] of product.adjustments.entries()) {
      for (const match of rule.matches) {
        const key = `${rule.field}:${canonical(match)}`;
        if (optionNames.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["products", productIndex, "adjustments", ruleIndex], message: `Opción duplicada: ${match}` });
        optionNames.add(key);
      }
    }
  }
  const communes = new Set<string>();
  for (const [index, rate] of catalog.shippingRates.entries()) {
    for (const name of [rate.commune, ...rate.aliases]) {
      const key = canonical(name);
      if (communes.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["shippingRates", index], message: `Comuna o alias duplicado: ${name}` });
      communes.add(key);
    }
  }
});

export type QuoteCatalog = z.infer<typeof quoteCatalogSchema>;
export type QuoteProduct = z.infer<typeof quoteProductSchema>;
export type QuoteAdjustment = z.infer<typeof quoteAdjustmentSchema>;
export type ShippingRate = z.infer<typeof shippingRateSchema>;

export const EMPTY_QUOTE_CATALOG: QuoteCatalog = {
  enabled: false,
  currency: "CLP",
  products: [],
  shippingRates: [],
};
