import { describe, expect, it } from "vitest";
import { resolveBotStage, type BotStage } from "@/server/bot/stage";
import type { CommercialEvidenceKey } from "@/server/bot/stage-evidence";

const stages: BotStage[] = [
  { id: "nuevo", name: "Nuevo", kind: "open", position: 0 },
  {
    id: "conversacion",
    name: "En conversación",
    kind: "open",
    position: 1,
  },
  { id: "interesado", name: "Interesado", kind: "open", position: 2 },
  { id: "pedido", name: "Pedido", kind: "open", position: 3 },
  { id: "cliente", name: "Cliente", kind: "won", position: 4 },
  { id: "perdido", name: "Perdido", kind: "lost", position: 5 },
];

type Expected =
  | { ok: true; stage: string }
  | { ok: false; reason: string; missing?: CommercialEvidenceKey[] };

type TransitionCase = {
  name: string;
  current: string;
  target: string;
  evidence: CommercialEvidenceKey[];
  expected: Expected;
};

const completeOrder: CommercialEvidenceKey[] = [
  "product_identified",
  "order_confirmation",
  "quantity_confirmed",
  "configuration_complete",
  "delivery_commune",
  "delivery_address",
  "recipient_confirmed",
];

const cases: TransitionCase[] = [
  {
    name: "un saludo permanece en Nuevo",
    current: "Nuevo",
    target: "En conversación",
    evidence: [],
    expected: { ok: false, reason: "insufficient_evidence" },
  },
  {
    name: "una pregunta comercial inicia la conversación",
    current: "Nuevo",
    target: "En conversación",
    evidence: ["commercial_question"],
    expected: { ok: true, stage: "En conversación" },
  },
  {
    name: "producto e interés fuerte avanzan a Interesado",
    current: "En conversación",
    target: "Interesado",
    evidence: ["product_identified", "explicit_interest"],
    expected: { ok: true, stage: "Interesado" },
  },
  {
    name: "un pedido incompleto permanece en Interesado",
    current: "Interesado",
    target: "Pedido",
    evidence: [
      "product_identified",
      "order_confirmation",
      "delivery_commune",
    ],
    expected: {
      ok: false,
      reason: "insufficient_evidence",
      missing: [
        "quantity_confirmed",
        "configuration_complete",
        "delivery_address",
        "recipient_confirmed",
      ],
    },
  },
  {
    name: "un pedido completo avanza a Pedido",
    current: "Interesado",
    target: "Pedido",
    evidence: completeOrder,
    expected: { ok: true, stage: "Pedido" },
  },
  {
    name: "un retroceso se rechaza",
    current: "Interesado",
    target: "En conversación",
    evidence: ["commercial_question"],
    expected: { ok: false, reason: "backward_stage" },
  },
  {
    name: "un salto se rechaza",
    current: "Nuevo",
    target: "Interesado",
    evidence: ["product_identified", "explicit_interest"],
    expected: { ok: false, reason: "stage_skip" },
  },
  {
    name: "NEA no puede declarar Cliente",
    current: "Pedido",
    target: "Cliente",
    evidence: completeOrder,
    expected: { ok: false, reason: "protected_stage" },
  },
  {
    name: "NEA no puede declarar Perdido",
    current: "Pedido",
    target: "Perdido",
    evidence: [],
    expected: { ok: false, reason: "protected_stage" },
  },
];

describe("P05 · matriz completa de transiciones comerciales", () => {
  it.each(cases)("$name", ({ current, target, evidence, expected }) => {
    const currentStage = stages.find((stage) => stage.name === current)!;
    const result = resolveBotStage(target, currentStage, stages, evidence);

    if (expected.ok) {
      expect(result).toMatchObject({
        ok: true,
        target: { name: expected.stage },
      });
      return;
    }

    expect(result).toMatchObject({ ok: false, reason: expected.reason });
    if (expected.missing) {
      expect(result).toMatchObject({ missingEvidence: expected.missing });
    }
  });
});
