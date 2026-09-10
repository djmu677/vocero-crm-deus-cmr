/**
 * Contrato comercial para los movimientos automáticos del pipeline.
 *
 * P02 define el vocabulario y los requisitos. Todavía no decide ni ejecuta
 * movimientos: el validador determinista de P03 consumirá este contrato.
 */

export const COMMERCIAL_EVIDENCE_KEYS = [
  "commercial_question",
  "product_identified",
  "product_preference",
  "explicit_interest",
  "price_question",
  "delivery_question",
  "order_confirmation",
  "quantity_confirmed",
  "configuration_complete",
  "delivery_commune",
  "delivery_address",
  "recipient_confirmed",
] as const;

export type CommercialEvidenceKey = (typeof COMMERCIAL_EVIDENCE_KEYS)[number];

export const STAGE_BLOCKER_CODES = [
  "greeting_only",
  "generic_question_only",
  "missing_product",
  "missing_buying_signal",
  "ambiguous_confirmation",
  "missing_quantity",
  "missing_configuration",
  "missing_delivery_commune",
  "missing_delivery_address",
  "missing_recipient",
  "protected_outcome_stage",
] as const;

export type StageBlockerCode = (typeof STAGE_BLOCKER_CODES)[number];

export type SemanticSalesStage = "conversation" | "interested" | "order";

export interface StageEvidenceContract {
  /** Identidad estable; el nombre visible de la columna puede cambiar. */
  stage: SemanticSalesStage;
  defaultLabel: string;
  /** Todas estas evidencias deben existir. */
  allOf: readonly CommercialEvidenceKey[];
  /** Si contiene elementos, al menos uno debe existir. */
  anyOf: readonly CommercialEvidenceKey[];
  /** Motivos estables que explican por qué todavía no se puede avanzar. */
  blockerCodes: readonly StageBlockerCode[];
  achievement: string;
}

/**
 * Política comercial inicial. Es deliberadamente independiente del rubro:
 * `configuration_complete` representa los campos que cada tenant defina para
 * su producto (por ejemplo tela, color, brazos o patas en una mueblería).
 */
export const DEFAULT_SALES_STAGE_EVIDENCE: Readonly<
  Record<SemanticSalesStage, StageEvidenceContract>
> = {
  conversation: {
    stage: "conversation",
    defaultLabel: "En conversación",
    allOf: [],
    anyOf: ["commercial_question", "product_identified"],
    blockerCodes: ["greeting_only", "generic_question_only"],
    achievement:
      "El lead dejó el saludo y comenzó una conversación comercial real.",
  },
  interested: {
    stage: "interested",
    defaultLabel: "Interesado",
    allOf: ["product_identified"],
    anyOf: [
      "product_preference",
      "explicit_interest",
      "price_question",
      "delivery_question",
    ],
    blockerCodes: ["missing_product", "missing_buying_signal"],
    achievement:
      "Existe un producto concreto y al menos una señal verificable de intención de compra.",
  },
  order: {
    stage: "order",
    defaultLabel: "Pedido",
    allOf: [
      "product_identified",
      "order_confirmation",
      "quantity_confirmed",
      "configuration_complete",
      "delivery_commune",
      "delivery_address",
      "recipient_confirmed",
    ],
    anyOf: [],
    blockerCodes: [
      "missing_product",
      "ambiguous_confirmation",
      "missing_quantity",
      "missing_configuration",
      "missing_delivery_commune",
      "missing_delivery_address",
      "missing_recipient",
    ],
    achievement:
      "El cliente confirmó un pedido ejecutable con producto, configuración y entrega completas.",
  },
} as const;

/** Ganado, perdido y entregado/pagado requieren una fuente humana o externa. */
export const PROTECTED_OUTCOME_STAGE_KINDS = ["won", "lost"] as const;
