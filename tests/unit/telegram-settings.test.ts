import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

const insertedRows: Record<string, unknown>[] = [];

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: (value: Record<string, unknown>) => {
        insertedRows.push(value);
        return { onConflictDoUpdate: () => Promise.resolve() };
      },
    }),
  }),
  schema: { telegramAlertSettings: { organizationId: "organization_id" } },
}));

beforeAll(() => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgresql://t:t@localhost:5432/t";
  process.env.BETTER_AUTH_SECRET = "secret-de-test-suficiente";
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-test";
});

describe("configuración Telegram por organización", () => {
  it("cifra el token y conserva el organizationId que delimita al tenant", async () => {
    const { saveTelegramSettings } = await import("@/server/telegram/settings");
    const token = "123456:token-super-secreto";
    await saveTelegramSettings({
      organizationId: "org_telegram_1",
      token,
      chatId: "-10042",
      botUsername: "parley_bot",
      chatLabel: "Ventas",
      enabled: true,
    });
    const row = insertedRows[0]!;
    expect(row.organizationId).toBe("org_telegram_1");
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.botTokenCipher).toBeTruthy();
    expect(row.botTokenIv).toBeTruthy();
    expect(row.botTokenTag).toBeTruthy();
  });

  it("no devuelve el token completo y restringe cambios al propietario", () => {
    const settings = readFileSync("src/server/telegram/settings.ts", "utf8");
    const route = readFileSync("src/app/api/settings/telegram/route.ts", "utf8");
    expect(settings).toContain("tokenLast4: settings.token.slice(-4)");
    expect(route).toContain('session.role !== "owner"');
    expect(route).not.toContain("token: settings.token");
  });
});
