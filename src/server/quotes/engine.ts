import type {
  QuoteAdjustment,
  QuoteCatalog,
  QuoteProduct,
  ShippingRate,
} from "@/server/quotes/config";

type Ficha = Record<string, unknown>;

export type PricedExtra = {
  label: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};

export type QuoteResult =
  | {
      ok: true;
      currency: string;
      product: string;
      quantity: number;
      basePriceCents: number;
      adjustmentsCents: number;
      itemSubtotalCents: number;
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
      extras: PricedExtra[];
      applied: string[];
    }
  | {
      ok: false;
      code:
        | "product_required"
        | "product_not_found"
        | "commune_required"
        | "commune_not_found"
        | "invalid_quantity"
        | "option_required"
        | "option_not_found"
        | "extra_not_found"
        | "amount_too_large";
      message: string;
      /** Campo exacto que debe corregirse; evita que el agente lo adivine. */
      missingField?: QuoteAdjustment["field"];
      /** Valor que no coincidió, si el cliente sí había dado uno. */
      receivedValue?: string;
      /** Etiquetas canónicas admitidas para ese campo y producto. */
      allowedOptions?: string[];
    };

export function normalizeQuoteKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matches(value: unknown, names: string[]): boolean {
  const key = normalizeQuoteKey(value);
  return Boolean(key) && names.some((name) => normalizeQuoteKey(name) === key);
}

function findProduct(catalog: QuoteCatalog, value: unknown): QuoteProduct | null {
  return catalog.products.find((item) => matches(value, [item.name, ...item.aliases])) ?? null;
}

function findShipping(catalog: QuoteCatalog, value: unknown): ShippingRate | null {
  return catalog.shippingRates.find((item) => matches(value, [item.commune, ...item.aliases])) ?? null;
}

function quantity(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
}

function scalarAdjustment(adjustment: QuoteAdjustment, ficha: Ficha): boolean {
  if (adjustment.field === "order_extras") return false;
  return matches(ficha[adjustment.field], adjustment.matches);
}

const FIELD_LABELS: Record<Exclude<QuoteAdjustment["field"], "order_extras">, string> = {
  product_variant: "la variante",
  product_configuration: "la configuración",
  material: "el material o tela",
  color: "el color",
  legs: "el tipo de patas",
};

function listAllowedOptions(
  product: QuoteProduct,
  field: QuoteAdjustment["field"]
): string[] {
  return Array.from(
    new Set(
      product.adjustments
        .filter((item) => item.field === field)
        .map((item) => item.label.trim())
        .filter(Boolean)
    )
  );
}

function extraRows(value: unknown): Array<{ label: string; quantity: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const count = quantity(row.quantity);
    return label && count ? [{ label, quantity: count }] : [];
  });
}

export function calculateQuote(catalog: QuoteCatalog, ficha: Ficha): QuoteResult {
  const productValue = ficha.product ?? ficha.producto ?? ficha.model ?? ficha.modelo;
  if (!normalizeQuoteKey(productValue)) {
    return { ok: false, code: "product_required", message: "Falta confirmar el producto" };
  }
  const product = findProduct(catalog, productValue);
  if (!product) {
    return { ok: false, code: "product_not_found", message: "El producto no está configurado en el cotizador" };
  }
  const count = quantity(ficha.quantity_confirmed ?? ficha.quantity ?? ficha.cantidad ?? 1);
  if (!count) {
    return { ok: false, code: "invalid_quantity", message: "La cantidad no es válida" };
  }
  const communeValue = ficha.delivery_commune ?? ficha.comuna ?? ficha.commune ?? ficha.geo;
  if (!normalizeQuoteKey(communeValue)) {
    return { ok: false, code: "commune_required", message: "Falta confirmar la comuna de entrega" };
  }
  const shipping = findShipping(catalog, communeValue);
  if (!shipping) {
    return { ok: false, code: "commune_not_found", message: "La comuna no está configurada en el cotizador" };
  }

  const pricedFields = new Set(
    product.adjustments
      .filter((item) => item.field !== "order_extras")
      .map((item) => item.field)
  );
  for (const field of pricedFields) {
    const value = ficha[field];
    const allowedOptions = listAllowedOptions(product, field);
    if (!normalizeQuoteKey(value)) {
      return {
        ok: false,
        code: "option_required",
        message: `Falta confirmar ${FIELD_LABELS[field as keyof typeof FIELD_LABELS]}`,
        missingField: field,
        allowedOptions,
      };
    }
    if (
      !product.adjustments.some(
        (item) => item.field === field && matches(value, item.matches)
      )
    ) {
      return {
        ok: false,
        code: "option_not_found",
        message: `La opción ${String(value)} no está configurada en el cotizador`,
        missingField: field,
        receivedValue: String(value),
        allowedOptions,
      };
    }
  }

  const rawExtras = extraRows(ficha.order_extras);
  const unknownExtra = rawExtras.find(
    (extra) =>
      !product.adjustments.some(
        (item) => item.field === "order_extras" && matches(extra.label, item.matches)
      )
  );
  if (unknownExtra) {
    return {
      ok: false,
      code: "extra_not_found",
      message: `El adicional ${unknownExtra.label} no está configurado en el cotizador`,
      missingField: "order_extras",
      receivedValue: unknownExtra.label,
      allowedOptions: listAllowedOptions(product, "order_extras"),
    };
  }

  const applied: string[] = [];
  let scalarAdjustments = 0;
  for (const adjustment of product.adjustments) {
    if (scalarAdjustment(adjustment, ficha)) {
      scalarAdjustments += adjustment.priceCents;
      applied.push(adjustment.label);
    }
  }

  const extras: PricedExtra[] = [];
  for (const extra of rawExtras) {
    const rule = product.adjustments.find(
      (item) => item.field === "order_extras" && matches(extra.label, item.matches)
    );
    if (!rule) continue;
    extras.push({
      label: rule.label,
      quantity: extra.quantity,
      unit_price_cents: rule.priceCents,
      subtotal_cents: rule.priceCents * extra.quantity,
    });
    applied.push(rule.label);
  }

  const extrasTotal = extras.reduce((sum, item) => sum + item.subtotal_cents, 0);
  const basePriceCents = product.basePriceCents;
  const itemSubtotalCents = (basePriceCents + scalarAdjustments) * count + extrasTotal;
  const totalCents = itemSubtotalCents + shipping.priceCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 2_000_000_000) {
    return {
      ok: false,
      code: "amount_too_large",
      message: "El total supera el límite admitido por el cotizador",
    };
  }
  return {
    ok: true,
    currency: catalog.currency,
    product: product.name,
    quantity: count,
    basePriceCents,
    adjustmentsCents: scalarAdjustments * count + extrasTotal,
    itemSubtotalCents,
    subtotalCents: itemSubtotalCents,
    shippingCents: shipping.priceCents,
    totalCents,
    extras,
    applied,
  };
}
