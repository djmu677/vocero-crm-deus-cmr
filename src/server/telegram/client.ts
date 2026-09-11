const TELEGRAM_BASE_URL = "https://api.telegram.org";

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export class TelegramApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TelegramApiError";
  }
}

async function telegramRequest<T>(
  token: string,
  method: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch
): Promise<T> {
  const response = await fetcher(
    `${TELEGRAM_BASE_URL}/bot${encodeURIComponent(token)}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    }
  );
  const payload = (await response.json().catch(() => null)) as TelegramEnvelope<T> | null;
  if (!response.ok || !payload?.ok || payload.result === undefined) {
    throw new TelegramApiError(
      payload?.description || "Telegram no aceptó la solicitud",
      response.status
    );
  }
  return payload.result;
}

export type TelegramBot = { id: number; username?: string; first_name: string };
export type TelegramChat = { id: number; title?: string; username?: string; first_name?: string };

export function getTelegramBot(token: string, fetcher?: typeof fetch) {
  return telegramRequest<TelegramBot>(token, "getMe", {}, fetcher);
}

export function getTelegramChat(token: string, chatId: string, fetcher?: typeof fetch) {
  return telegramRequest<TelegramChat>(token, "getChat", { chat_id: chatId }, fetcher);
}

export function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  fetcher?: typeof fetch
) {
  return telegramRequest<{ message_id: number }>(
    token,
    "sendMessage",
    { chat_id: chatId, text, disable_web_page_preview: true },
    fetcher
  );
}
