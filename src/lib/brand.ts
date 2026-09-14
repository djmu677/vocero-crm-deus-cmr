import { PARLEY_BRAND } from "@/lib/design-system";

/**
 * Identidad de Parley compartida por React y el favicon generado en servidor.
 * El contorno representa una conversación abierta y la línea turquesa, una
 * respuesta clara. Mantener una sola geometría evita que la pestaña y la barra
 * lateral terminen mostrando símbolos distintos.
 */

/** Globo de conversación: hereda el acento del contexto. */
export const BRAND_MARK_BODY =
  "M7 5.5h10a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4h-5.2L6 20v-4.7a4 4 0 0 1-3-3.8v-2a4 4 0 0 1 4-4Z";

/** Respuesta corta: siempre usa la señal turquesa de Parley. */
export const BRAND_MARK_TAIL = "M9 11h6";

export const BRAND_MARK_STROKE = 2.2;
export const BRAND_CYAN = PARLEY_BRAND.signal;
export const BRAND_CYAN_ON_TILE = PARLEY_BRAND.signalOnTile;

/**
 * Solo la marca predeterminada dibuja el símbolo de Parley. Una organización
 * rebautizada conserva su inicial y nunca hereda el logo de otro producto.
 */
export function isParleyName(name: string): boolean {
  return name.trim().toLowerCase() === "parley";
}
