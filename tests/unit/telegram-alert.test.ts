import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { getTelegramBot, sendTelegramMessage } from "@/server/telegram/client";
import { buildOrderAlertText } from "@/server/telegram/order-alert";

describe("cliente oficial de Telegram", () => {
  it("envía JSON al método sendMessage con el chat exacto", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    await sendTelegramMessage("123:secret", "-10042", "Pedido listo", fetcher as typeof fetch);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain("api.telegram.org/bot123%3Asecret/sendMessage");
    expect(JSON.parse(String(init?.body))).toEqual({
      chat_id: "-10042", text: "Pedido listo", disable_web_page_preview: true,
    });
  });

  it("no filtra el token en errores de la plataforma", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: false, description: "Unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    }));
    await expect(getTelegramBot("123:supersecret", fetcher as typeof fetch))
      .rejects.toEqual(expect.objectContaining({ message: "Unauthorized", status: 401 }));
    await expect(getTelegramBot("123:supersecret", fetcher as typeof fetch)).rejects.not.toThrow("supersecret");
  });
});

describe("resumen mínimo del pedido", () => {
  it("incluye datos comerciales permitidos y el enlace", () => {
    const text = buildOrderAlertText({
      contactName: "José",
      ficha: { producto: "Napoleón", color: "negro", comuna: "Conchalí", cantidad: 1 },
      conversationUrl: "https://parley.example/inbox?contact=ct_1",
    });
    expect(text).toContain("José");
    expect(text).toContain("Producto: Napoleón");
    expect(text).toContain("Comuna: Conchalí");
    expect(text).toContain("https://parley.example/inbox?contact=ct_1");
  });

  it("excluye datos personales y campos libres no aprobados", () => {
    const text = buildOrderAlertText({
      contactName: "Ana",
      ficha: { telefono: "+56911111111", direccion: "Calle privada 1", email: "ana@example.com", notas: "secreto", modelo: "Catalina" },
      conversationUrl: "https://parley.example/inbox?contact=ct_2",
    });
    expect(text).toContain("Modelo: Catalina");
    expect(text).not.toContain("+56911111111");
    expect(text).not.toContain("Calle privada");
    expect(text).not.toContain("ana@example.com");
    expect(text).not.toContain("secreto");
  });
});

describe("guardarraíles del disparador", () => {
  const gate = readFileSync("src/server/leads/stage-history.ts", "utf8");
  const sender = readFileSync("src/server/telegram/order-alert.ts", "utf8");

  it("solo dispara después de una transición confirmada a la clave order", () => {
    expect(gate).toContain('result.ok && result.changed && toBotStageKey === "order"');
    const txEnd = gate.indexOf("  });");
    expect(gate.indexOf("sendOrderAlert(", txEnd)).toBeGreaterThan(txEnd);
  });

  it("el Laboratorio y otra organización quedan fuera", () => {
    expect(sender).toContain("eq(schema.conversation.isTest, false)");
    expect(sender).toContain("eq(schema.lead.organizationId, input.organizationId)");
    expect(sender).toContain("eq(schema.contact.organizationId, input.organizationId)");
    expect(sender).toContain("eq(schema.conversation.organizationId, input.organizationId)");
  });
});
