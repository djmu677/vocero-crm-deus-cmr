import { describe, expect, it } from "vitest";
import { resolveBotStage, type BotStage } from "@/server/bot/stage";
import { semanticStageForName } from "@/server/bot/stage-evidence";

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
  { id: "ganado", name: "Cliente", kind: "won", position: 4 },
  { id: "perdido", name: "Perdido", kind: "lost", position: 5 },
];

describe("P03 · validador determinista del pipeline", () => {
  it("permite únicamente el siguiente paso con evidencia mínima", () => {
    expect(
      resolveBotStage("En conversación", stages[0]!, stages, [
        "commercial_question",
      ])
    ).toEqual({
      ok: true,
      target: stages[1],
      evidence: ["commercial_question"],
    });

    expect(
      resolveBotStage("Interesado", stages[1]!, stages, [
        "product_identified",
        "explicit_interest",
      ])
    ).toEqual({
      ok: true,
      target: stages[2],
      evidence: ["product_identified", "explicit_interest"],
    });
  });

  it("rechaza saltar de Nuevo a Interesado aunque se declare evidencia", () => {
    expect(
      resolveBotStage("Interesado", stages[0]!, stages, [
        "product_identified",
        "explicit_interest",
      ])
    ).toEqual({ ok: false, reason: "stage_skip" });
  });

  it("un saludo no demuestra una conversación comercial", () => {
    expect(resolveBotStage("En conversación", stages[0]!, stages)).toEqual({
      ok: false,
      reason: "insufficient_evidence",
      missingEvidence: ["commercial_question", "product_identified"],
      blockerCodes: ["generic_question_only"],
    });
  });

  it("Interesado exige producto y además una señal de compra", () => {
    expect(
      resolveBotStage("Interesado", stages[1]!, stages, ["product_identified"])
    ).toEqual({
      ok: false,
      reason: "insufficient_evidence",
      missingEvidence: [
        "product_preference",
        "explicit_interest",
        "price_question",
        "delivery_question",
      ],
      blockerCodes: ["missing_buying_signal"],
    });
  });

  it("Pedido enumera cada dato obligatorio que falta", () => {
    const result = resolveBotStage("Pedido", stages[2]!, stages, [
      "product_identified",
      "order_confirmation",
      "delivery_commune",
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "insufficient_evidence",
      missingEvidence: [
        "quantity_confirmed",
        "configuration_complete",
        "delivery_address",
        "recipient_confirmed",
      ],
      blockerCodes: [
        "missing_quantity",
        "missing_configuration",
        "missing_delivery_address",
        "missing_recipient",
      ],
    });
  });

  it("permite Pedido solo cuando el pedido es ejecutable", () => {
    const evidence = [
      "product_identified",
      "order_confirmation",
      "quantity_confirmed",
      "configuration_complete",
      "delivery_commune",
      "delivery_address",
      "recipient_confirmed",
    ] as const;

    expect(resolveBotStage("Pedido", stages[2]!, stages, evidence)).toEqual({
      ok: true,
      target: stages[3],
      evidence: [...evidence],
    });
  });

  it("una columna personalizada sin contrato se mantiene cerrada al bot", () => {
    const custom: BotStage = {
      id: "cotizacion",
      name: "Cotización enviada",
      kind: "open",
      position: 3,
      botMoveCriteria: "cuando exista una cotización formal",
    };
    const customStages = [...stages.slice(0, 3), custom, ...stages.slice(4)];

    expect(
      resolveBotStage("Cotización enviada", stages[2]!, customStages, [
        "explicit_interest",
      ])
    ).toEqual({
      ok: false,
      reason: "stage_rule_missing",
      missingEvidence: [],
      blockerCodes: [],
    });
  });

  it("repetir la etapa actual es idempotente y no fabrica evidencia", () => {
    expect(resolveBotStage("Interesado", stages[2]!, stages)).toEqual({
      ok: true,
      target: stages[2],
      evidence: [],
    });
  });

  it("normaliza el acento del nombre pero no acepta nombres aproximados", () => {
    expect(semanticStageForName("En conversacion")).toBe("conversation");
    expect(semanticStageForName("Conversando")).toBeNull();
  });

  it("el caso Napoleón queda en Interesado y no alcanza Pedido", () => {
    const interestEvidence = ["product_identified", "product_preference"] as const;
    expect(
      resolveBotStage("Interesado", stages[1]!, stages, interestEvidence).ok
    ).toBe(true);

    const orderAttempt = resolveBotStage("Pedido", stages[2]!, stages, [
      "product_identified",
      "order_confirmation",
      "delivery_commune",
    ]);
    expect(orderAttempt).toMatchObject({
      ok: false,
      reason: "insufficient_evidence",
      blockerCodes: expect.arrayContaining([
        "missing_quantity",
        "missing_configuration",
        "missing_delivery_address",
        "missing_recipient",
      ]),
    });
  });

  it("la identidad comercial permanece válida aunque cambie el nombre visible", () => {
    const renamed = {
      ...stages[2]!,
      name: "Quiere comprar",
      botStageKey: "interested" as const,
    };
    const renamedStages = [stages[0]!, stages[1]!, renamed, ...stages.slice(3)];

    expect(
      resolveBotStage("Quiere comprar", stages[1]!, renamedStages, [
        "product_identified",
        "explicit_interest",
      ])
    ).toMatchObject({ ok: true, target: renamed });
  });
});
