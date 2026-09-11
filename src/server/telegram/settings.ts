import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

export type TelegramSettings = {
  token: string;
  chatId: string;
  botUsername: string | null;
  chatLabel: string | null;
  enabled: boolean;
};

export async function getTelegramSettings(organizationId: string): Promise<TelegramSettings | null> {
  const rows = await getDb().select().from(schema.telegramAlertSettings)
    .where(scoped(schema.telegramAlertSettings.organizationId, organizationId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    token: decryptSecret({ cipher: row.botTokenCipher, iv: row.botTokenIv, tag: row.botTokenTag }),
    chatId: row.chatId,
    botUsername: row.botUsername,
    chatLabel: row.chatLabel,
    enabled: row.enabled,
  };
}

export async function getTelegramSettingsView(organizationId: string) {
  const settings = await getTelegramSettings(organizationId);
  if (!settings) return null;
  return {
    chatId: settings.chatId,
    botUsername: settings.botUsername,
    chatLabel: settings.chatLabel,
    enabled: settings.enabled,
    tokenLast4: settings.token.slice(-4),
  };
}

export async function saveTelegramSettings(
  input: TelegramSettings & { organizationId: string }
): Promise<void> {
  const enc = encryptSecret(input.token);
  await getDb().insert(schema.telegramAlertSettings).values({
    id: newId("telegramAlertSettings"),
    organizationId: input.organizationId,
    botTokenCipher: enc.cipher,
    botTokenIv: enc.iv,
    botTokenTag: enc.tag,
    chatId: input.chatId,
    botUsername: input.botUsername,
    chatLabel: input.chatLabel,
    enabled: input.enabled,
  }).onConflictDoUpdate({
    target: [schema.telegramAlertSettings.organizationId],
    set: {
      botTokenCipher: enc.cipher,
      botTokenIv: enc.iv,
      botTokenTag: enc.tag,
      chatId: input.chatId,
      botUsername: input.botUsername,
      chatLabel: input.chatLabel,
      enabled: input.enabled,
      updatedAt: new Date(),
    },
  });
}

export async function deleteTelegramSettings(organizationId: string): Promise<void> {
  await getDb().delete(schema.telegramAlertSettings)
    .where(eq(schema.telegramAlertSettings.organizationId, organizationId));
}
