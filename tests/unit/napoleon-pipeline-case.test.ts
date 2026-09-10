import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Stage = "Nuevo" | "En conversación" | "Interesado" | "Pedido";

interface TranscriptEvent {
  sequence: number;
  time: string;
  actor: "customer" | "assistant";
  kind: "text" | "media";
  text: string;
  url?: string;
  observedStageAfter: Stage;
  expectedStageAfter: Stage;
}

interface NapoleonCase {
  caseId: string;
  initialStage: Stage;
  observedFinalStage: Stage;
  expectedFinalStage: Stage;
  missingForPedido: string[];
  events: TranscriptEvent[];
}

const fixtureUrl = new URL("../fixtures/napoleon_pipeline_case.json", import.meta.url);
const conversation = JSON.parse(readFileSync(fixtureUrl, "utf8")) as NapoleonCase;

describe("P01 · conversación Napoleón", () => {
  it("conserva el historial observado completo y en orden", () => {
    expect(conversation.events.map((event) => event.sequence)).toEqual(
      Array.from({ length: 23 }, (_, index) => index + 1)
    );
    expect(conversation.events[0]?.text).toBe("/reset");
    expect(conversation.events[4]?.text).toBe("Me gustaría saber más de napoleon");
    expect(conversation.events[8]?.text).toBe(
      "Me gusta la felpa, tienes muestras de colores?"
    );
    expect(conversation.events[11]).toMatchObject({
      kind: "media",
      text: "Muestrario de colores en tela felpa",
    });
    expect(conversation.events.at(-2)?.text).toBe("Si");
    expect(conversation.events.at(-1)?.actor).toBe("assistant");
  });

  it("demuestra el movimiento omitido observado", () => {
    const mismatches = conversation.events.filter(
      (event) => event.observedStageAfter !== event.expectedStageAfter
    );

    expect(conversation.observedFinalStage).toBe("Nuevo");
    expect(conversation.expectedFinalStage).toBe("Interesado");
    expect(mismatches[0]).toMatchObject({
      sequence: 5,
      expectedStageAfter: "En conversación",
    });
    expect(mismatches).toContainEqual(
      expect.objectContaining({ sequence: 9, expectedStageAfter: "Interesado" })
    );
    expect(
      conversation.events.every((event) => event.observedStageAfter === "Nuevo")
    ).toBe(true);
  });

  it("mantiene el caso en Interesado porque el pedido sigue incompleto", () => {
    const expectedStages = new Set(
      conversation.events.map((event) => event.expectedStageAfter)
    );

    expect(expectedStages.has("Pedido")).toBe(false);
    expect(conversation.missingForPedido).toEqual([
      "color definitivo",
      "dirección completa de entrega",
      "datos de contacto o receptor confirmados",
    ]);
  });
});
