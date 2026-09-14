import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  getTelegramBot,
  sendTelegramMessage,
  TelegramApiError,
} from "@/server/telegram/client";
import {
  buildOrderAlertText,
  isTemporaryTelegramFailure,
  telegramRetryDelayMs,
  TELEGRAM_ALERT_MAX_ATTEMPTS,
} from "@/server/telegram/order-alert";

describe("cliente oficial de Telegram", () => {
  it("envía JSON al método sendMessage con el chat exacto", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    await sendTelegramMessage(
      "123:secret",
      "-10042",
      "Pedido listo",
      fetcher as typeof fetch
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain("api.telegram.org/bot123%3Asecret/sendMessage");
    expect(JSON.parse(String(init?.body))).toEqual({
      chat_id: "-10042",
      text: "Pedido listo",
      disable_web_page_preview: true,
    });
  });

  it("activa HTML solamente cuando la comanda lo solicita", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true, result: { message_id: 8 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    await sendTelegramMessage(
      "123:secret",
      "-10042",
      "<b>Pedido</b>",
      fetcher as typeof fetch,
      { parseMode: "HTML" }
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toMatchObject({
      parse_mode: "HTML",
    });
  });

  it("no filtra el token en errores de la plataforma", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: false, description: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
    );
    await expect(getTelegramBot("123:supersecret", fetcher as typeof fetch))
      .rejects.toEqual(
        expect.objectContaining({ message: "Unauthorized", status: 401 })
      );
    await expect(
      getTelegramBot("123:supersecret", fetcher as typeof fetch)
    ).rejects.not.toThrow("supersecret");
  });

  it("conserva el retry_after oficial cuando Telegram limita solicitudes", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            description: "Too Many Requests",
            parameters: { retry_after: 45 },
          }),
          { status: 429, headers: { "content-type": "application/json" } }
        )
    );
    await expect(
      sendTelegramMessage("123:secret", "-10042", "Pedido", fetcher)
    ).rejects.toMatchObject({ status: 429, retryAfterSeconds: 45 });
  });
});

describe("política de reintentos Telegram", () => {
  it("usa backoff creciente y un máximo explícito", () => {
    expect(telegramRetryDelayMs(1)).toBe(30_000);
    expect(telegramRetryDelayMs(2)).toBe(120_000);
    expect(telegramRetryDelayMs(3)).toBe(600_000);
    expect(telegramRetryDelayMs(99)).toBe(7_200_000);
    expect(TELEGRAM_ALERT_MAX_ATTEMPTS).toBe(6);
  });

  it("reintenta red, límites y servidor; no credenciales inválidas", () => {
    expect(isTemporaryTelegramFailure(new TypeError("network error"))).toBe(true);
    expect(isTemporaryTelegramFailure(new TelegramApiError("limit", 429))).toBe(true);
    expect(isTemporaryTelegramFailure(new TelegramApiError("upstream", 503))).toBe(true);
    expect(isTemporaryTelegramFailure(new TelegramApiError("unauthorized", 401))).toBe(false);
    expect(isTemporaryTelegramFailure(new TelegramApiError("bad request", 400))).toBe(false);
  });
});

describe("comanda operativa del pedido", () => {
  it("produce el formato solicitado con datos y precios confiables", () => {
    const text = buildOrderAlertText({
      leadId: "ld_686345dt917babcdef00",
      contactName: "Deusdenith Marquez",
      contactPhone: "+56950781109",
      ficha: {
        email: "deuspagos@gmail.com",
        product: "Catalina",
        quantity_confirmed: "1",
        material: "lino",
        color: "Negro",
        legs: "Madera",
        delivery_commune: "Buin",
        delivery_address: "Francisco Javier Krueger 3581, casa 15",
        recipient_confirmed: "Deusdenith Marquez",
        base_price_cents: 29_000_000,
        item_subtotal_cents: 35_000_000,
        subtotal_cents: 35_000_000,
        shipping_cost_cents: 1_800_000,
        order_total_cents: 36_800_000,
        order_extras: [
          {
            label: "Patas de madera",
            quantity: 1,
            subtotal_cents: 3_000_000,
          },
          {
            label: "Puffs adicionales",
            quantity: 2,
            unit_price_cents: 1_000_000,
            subtotal_cents: 2_000_000,
          },
          {
            label: "Cojines adicionales",
            quantity: 2,
            unit_price_cents: 500_000,
            subtotal_cents: 1_000_000,
          },
        ],
      },
      amountCents: null,
      currency: "CLP",
      conversationUrl: "https://crm.estudiolo.co/inbox?contact=ct_1",
    });

    expect(text).toContain("<b>CATALINA</b>");
    expect(text).toContain("PEDIDO N.º PAR-686345-CDEF00");
    expect(text).toContain("Teléfono: +56950781109");
    expect(text).toContain("Correo: deuspagos@gmail.com");
    expect(text).toContain("Comuna: Buin");
    expect(text).toContain(
      "Dirección: Francisco Javier Krueger 3581, casa 15"
    );
    expect(text).toContain("Color: Negro (lino)");
    expect(text).toContain("Patas: Madera — $30.000");
    expect(text).toContain("Puffs adicionales: 2 × $10.000 = $20.000");
    expect(text).toContain("Despacho: $18.000");
    expect(text).toContain("<b>TOTAL: $368.000</b>");
    expect(text).toContain("Abrir conversación en Parley");
  });

  it("marca ausencias sin inventar y escapa contenido para Telegram", () => {
    const text = buildOrderAlertText({
      leadId: "ld_test",
      contactName: "Ana <ventas>",
      contactPhone: null,
      ficha: { product: "Mesa & silla", notas: "no debe salir" },
      amountCents: null,
      currency: "CLP",
      conversationUrl: "https://parley.example/inbox?contact=ct_2&x=1",
    });
    expect(text).toContain("Ana &lt;ventas&gt;");
    expect(text).toContain("Mesa &amp; silla");
    expect(text).toContain("Teléfono: No informado");
    expect(text).toContain("TOTAL: No informado");
    expect(text).not.toContain("no debe salir");
    expect(text).toContain("ct_2&amp;x=1");
  });
});

describe("guardarraíles del disparador", () => {
  const gate = readFileSync("src/server/leads/stage-history.ts", "utf8");
  const sender = readFileSync("src/server/telegram/order-alert.ts", "utf8");
  const schema = readFileSync("src/lib/db/schema.ts", "utf8");
  const worker = readFileSync("src/server/telegram/worker.ts", "utf8");
  const boot = readFileSync("src/instrumentation.ts", "utf8");

  it("registra la alerta dentro de la transición y la envía después del commit", () => {
    expect(gate).toContain('target.botStageKey === "order"');
    expect(gate).toContain("schema.telegramOrderAlert");
    expect(gate).toContain("onConflictDoNothing");
    const txEnd = gate.indexOf("  });");
    expect(gate.indexOf("processTelegramOrderAlert(", txEnd)).toBeGreaterThan(txEnd);
  });

  it("deduplica por organización y lead mediante un UNIQUE real", () => {
    expect(schema).toContain('"telegram_order_alert"');
    expect(schema).toContain('uniqueIndex("telegram_order_alert_org_lead_uq")');
    expect(schema).toContain("t.organizationId");
    expect(schema).toContain("t.leadId");
  });

  it("el worker arranca con el servidor y recupera filas vencidas", () => {
    expect(boot).toContain("startBackgroundWorkers");
    expect(worker).toContain("processDueTelegramOrderAlerts");
    expect(worker).toContain("setInterval");
  });

  it("el Laboratorio y otra organización quedan fuera", () => {
    expect(sender).toContain("eq(schema.conversation.isTest, false)");
    expect(sender).toContain(
      "eq(schema.lead.organizationId, alert.organizationId)"
    );
    expect(sender).toContain(
      "eq(schema.contact.organizationId, alert.organizationId)"
    );
    expect(sender).toContain(
      "eq(schema.conversation.organizationId, alert.organizationId)"
    );
  });
});
