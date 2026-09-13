import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

/**
 * Ficha de calificación del lead: lo que el cerebro externo va descubriendo
 * en la conversación.
 *
 * Las claves NO están cableadas. Cada negocio califica distinto —una clínica
 * pregunta el tratamiento, una constructora los metros, una agencia el
 * presupuesto— y el CRM no tiene por qué migrar cada vez que alguien cambia su
 * cuestionario. Lo que sí impone el CRM es que lo guardado sea sano: escalares,
 * acotados y en número razonable.
 *
 * La validación es FLOJA a propósito. Del otro lado hay un LLM que deriva: hoy
 * manda `dolor_principal` y mañana `dolorPrincipal`, o un `"sí"` donde antes
 * mandaba `true`. Devolverle un 422 le tira datos reales de calificación que ya
 * costaron una conversación; se prefiere guardar lo que se entienda e ignorar
 * en silencio lo que no.
 */

/** Tope de claves por ficha: contiene un bot en bucle sin estorbar a nadie. */
const MAX_KEYS = 40;
const MAX_KEY_LEN = 60;
const MAX_VALUE_LEN = 500;

export type FichaInput = Record<string, unknown>;
export type FichaExtra = { label: string; quantity: number };
export type FichaValue = string | number | boolean | null | FichaExtra[];
export type Ficha = Record<string, FichaValue>;

const TRUSTED_PRICE_FIELDS = new Set([
  "base_price_cents",
  "unit_price_cents",
  "item_subtotal_cents",
  "subtotal_cents",
  "shipping_cost_cents",
  "delivery_cost_cents",
  "order_total_cents",
  "total_cents",
  "quote_currency",
  "quote_status",
  "quote_applied",
]);
const PRICE_INVALIDATING_FIELDS = new Set([
  "product",
  "producto",
  "model",
  "modelo",
  "product_variant",
  "product_configuration",
  "material",
  "color",
  "legs",
  "quantity_confirmed",
  "quantity",
  "cantidad",
  "order_extras",
  "delivery_commune",
  "comuna",
  "commune",
  "geo",
]);

function normalizeExtras(value: unknown): FichaExtra[] | null {
  if (!Array.isArray(value)) return null;
  const extras = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 80) : "";
    const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
    if (!label || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return [];
    return [{ label, quantity }];
  });
  return extras.slice(0, 12);
}

/**
 * Deja la ficha en valores que se puedan guardar y mostrar: escalares
 * acotados. `null` sobrevive porque significa "borra esta clave". Objetos,
 * arreglos y claves absurdas se ignoran sin error.
 */
export function normalizeFicha(raw: FichaInput): Ficha {
  const out: Ficha = {};
  if (!raw || typeof raw !== "object") return out;

  for (const [rawKey, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_KEYS) break;

    const key = rawKey.trim();
    if (!key || key.length > MAX_KEY_LEN) continue;
    // Los importes solo los escribe el cotizador del servidor. Ni el LLM ni
    // una corrección manual pueden convertir una suposición en precio oficial.
    if (TRUSTED_PRICE_FIELDS.has(key)) continue;

    if (key === "order_extras") {
      const extras = normalizeExtras(value);
      if (extras) out[key] = extras;
      continue;
    }

    if (value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const v = value.trim();
      // La cadena vacía no borra: para eso está `null` explícito. Un LLM manda
      // "" con demasiada facilidad como para dejarlo tirar un dato bueno.
      if (v) out[key] = v.slice(0, MAX_VALUE_LEN);
      continue;
    }
    // Objetos y arreglos: fuera. Se ignoran sin error (ver arriba).
  }
  return out;
}

/** Merge campo a campo: lo ausente se conserva, `null` explícito borra. */
export function mergeFicha(prev: Ficha | null | undefined, patch: Ficha): Ficha {
  const out: Ficha = { ...(prev ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key];
    else out[key] = value;
  }
  return out;
}

/**
 * Escribe la ficha. Es la ÚNICA puerta: por aquí pasa el cerebro externo
 * (`PUT /api/bot/ficha`) y también el dueño desde la bandeja, así que los dos
 * heredan el mismo merge —`null` borra— y las mismas cotas.
 *
 * Merge y no reemplazo porque los dos escriben a la vez: el bot va llenando
 * mientras conversa y el dueño corrige lo que ve. Con reemplazo, el último en
 * guardar le borraría el trabajo al otro sin que nadie se entere.
 *
 * Devuelve `null` si el contacto no existe en esa organización.
 */
export async function upsertFicha(input: {
  organizationId: string;
  contactId: string;
  ficha: FichaInput;
}): Promise<{ ficha: Ficha } | null> {
  const db = getDb();
  const patch = normalizeFicha(input.ficha);

  // El acotamiento va aquí y no en cada llamador: una ficha es información de
  // calificación de un cliente ajeno, y confiar en que quien llame se acuerde
  // de filtrar por organización es exactamente como se filtran los datos entre
  // inquilinos.
  const alcance = scoped(
    schema.contact.organizationId,
    input.organizationId,
    eq(schema.contact.id, input.contactId)
  );

  const rows = await db
    .select({ ficha: schema.contact.ficha })
    .from(schema.contact)
    .where(alcance)
    .limit(1);
  if (!rows[0]) return null;

  const merged = mergeFicha(rows[0].ficha as Ficha | null, patch);
  if (Object.keys(patch).some((key) => PRICE_INVALIDATING_FIELDS.has(key))) {
    for (const key of TRUSTED_PRICE_FIELDS) delete merged[key];
    const extras = normalizeExtras(merged.order_extras);
    if (extras) merged.order_extras = extras;
  }

  await db
    .update(schema.contact)
    .set({ ficha: merged, updatedAt: new Date() })
    .where(alcance);

  return { ficha: merged };
}

/** Persiste una cotización ya calculada por el servidor y su total del lead. */
export async function persistQuotedFicha(input: {
  organizationId: string;
  contactId: string;
  leadId: string;
  ficha: Record<string, unknown>;
  totalCents: number;
  currency: string;
}): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.contact)
      .set({ ficha: input.ficha, updatedAt: new Date() })
      .where(
        scoped(
          schema.contact.organizationId,
          input.organizationId,
          eq(schema.contact.id, input.contactId)
        )
      );
    await tx
      .update(schema.lead)
      .set({
        amountCents: input.totalCents,
        currency: input.currency,
        updatedAt: new Date(),
      })
      .where(
        scoped(
          schema.lead.organizationId,
          input.organizationId,
          eq(schema.lead.id, input.leadId)
        )
      );
  });
}

export function serializeFicha(
  contact: typeof schema.contact.$inferSelect
): Ficha {
  return (contact.ficha as Ficha | null) ?? {};
}
