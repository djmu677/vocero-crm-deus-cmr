/**
 * Contrato comercial para los movimientos automáticos del pipeline.
 *
 * P02 define el vocabulario y los requisitos. P03 aplica este contrato antes
 * de que un movimiento solicitado por NEA llegue a la puerta de escritura.
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

export type StageEvidenceDecision =
  | { ok: true; contract: StageEvidenceContract }
  | {
      ok: false;
      reason: "stage_rule_missing" | "insufficient_evidence";
      contract: StageEvidenceContract | null;
      missingEvidence: CommercialEvidenceKey[];
      blockerCodes: StageBlockerCode[];
    };

function normalizedStageName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

/**
 * Resuelve únicamente las etapas cuyo significado comercial está definido en
 * el contrato. Una columna personalizada sin regla estructurada se rechaza:
 * un texto libre en `botMoveCriteria` puede orientar a NEA, pero no constituye
 * una condición verificable para el servidor.
 */
export function semanticStageForName(
  stageName: string
): SemanticSalesStage | null {
  switch (normalizedStageName(stageName)) {
    case "en conversacion":
      return "conversation";
    case "interesado":
      return "interested";
    case "pedido":
      return "order";
    default:
      return null;
  }
}

const blockerByMissingEvidence: Readonly<
  Partial<Record<CommercialEvidenceKey, StageBlockerCode>>
> = {
  product_identified: "missing_product",
  order_confirmation: "ambiguous_confirmation",
  quantity_confirmed: "missing_quantity",
  configuration_complete: "missing_configuration",
  delivery_commune: "missing_delivery_commune",
  delivery_address: "missing_delivery_address",
  recipient_confirmed: "missing_recipient",
};

/** Evalúa allOf/anyOf sin inferencias ni texto libre. */
export function validateStageEvidence(
  semanticStage: SemanticSalesStage | null,
  evidence: readonly CommercialEvidenceKey[]
): StageEvidenceDecision {
  if (!semanticStage) {
    return {
      ok: false,
      reason: "stage_rule_missing",
      contract: null,
      missingEvidence: [],
      blockerCodes: [],
    };
  }

  const contract = DEFAULT_SALES_STAGE_EVIDENCE[semanticStage];
  const available = new Set(evidence);
  const missingEvidence = contract.allOf.filter((key) => !available.has(key));
  const anyOfMissing =
    contract.anyOf.length > 0 &&
    !contract.anyOf.some((key) => available.has(key));

  if (anyOfMissing) {
    missingEvidence.push(...contract.anyOf);
  }

  if (missingEvidence.length === 0) return { ok: true, contract };

  const blockers = new Set<StageBlockerCode>();
  for (const key of contract.allOf.filter((key) => !available.has(key))) {
    const blocker = blockerByMissingEvidence[key];
    if (blocker) blockers.add(blocker);
  }
  if (semanticStage === "conversation" && anyOfMissing) {
    blockers.add("generic_question_only");
  }
  if (semanticStage === "interested" && anyOfMissing) {
    blockers.add("missing_buying_signal");
  }

  return {
    ok: false,
    reason: "insufficient_evidence",
    contract,
    missingEvidence: [...new Set(missingEvidence)],
    blockerCodes: [...blockers],
  };
}
