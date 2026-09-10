import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_EVIDENCE_KEYS,
  DEFAULT_SALES_STAGE_EVIDENCE,
  PROTECTED_OUTCOME_STAGE_KINDS,
  STAGE_BLOCKER_CODES,
} from "@/server/bot/stage-evidence";

describe("P02 · contrato de evidencia comercial", () => {
  it("un saludo no basta para En conversación", () => {
    const contract = DEFAULT_SALES_STAGE_EVIDENCE.conversation;

    expect(contract.allOf).toEqual([]);
    expect(contract.anyOf).toEqual([
      "commercial_question",
      "product_identified",
    ]);
    expect(contract.blockerCodes).toContain("greeting_only");
  });

  it("Interesado exige producto y una señal verificable de compra", () => {
    const contract = DEFAULT_SALES_STAGE_EVIDENCE.interested;

    expect(contract.allOf).toEqual(["product_identified"]);
    expect(contract.anyOf).toEqual([
      "product_preference",
      "explicit_interest",
      "price_question",
      "delivery_question",
    ]);
    expect(contract.blockerCodes).toEqual([
      "missing_product",
      "missing_buying_signal",
    ]);
  });

  it("Pedido exige confirmación y todos los datos para ejecutarlo", () => {
    const contract = DEFAULT_SALES_STAGE_EVIDENCE.order;

    expect(contract.anyOf).toEqual([]);
    expect(contract.allOf).toEqual([
      "product_identified",
      "order_confirmation",
      "quantity_confirmed",
      "configuration_complete",
      "delivery_commune",
      "delivery_address",
      "recipient_confirmed",
    ]);
    expect(contract.blockerCodes).toContain("ambiguous_confirmation");
    expect(contract.blockerCodes).toContain("missing_configuration");
    expect(contract.blockerCodes).toContain("missing_delivery_address");
  });

  it("el vocabulario no contiene claves repetidas ni textos libres", () => {
    expect(new Set(COMMERCIAL_EVIDENCE_KEYS).size).toBe(
      COMMERCIAL_EVIDENCE_KEYS.length
    );
    expect(new Set(STAGE_BLOCKER_CODES).size).toBe(STAGE_BLOCKER_CODES.length);
    for (const key of [...COMMERCIAL_EVIDENCE_KEYS, ...STAGE_BLOCKER_CODES]) {
      expect(key).toMatch(/^[a-z]+(?:_[a-z]+)*$/);
    }
  });

  it("ganado y perdido permanecen protegidos", () => {
    expect(PROTECTED_OUTCOME_STAGE_KINDS).toEqual(["won", "lost"]);
  });
});
