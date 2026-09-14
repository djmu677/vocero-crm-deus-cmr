import { processDueTelegramOrderAlerts } from "@/server/telegram/order-alert";

const POLL_MS = 30_000;

const workerState = globalThis as typeof globalThis & {
  __parleyTelegramAlertTimer?: ReturnType<typeof setInterval>;
  __parleyTelegramAlertRunning?: boolean;
};

async function drain(): Promise<void> {
  if (workerState.__parleyTelegramAlertRunning) return;
  workerState.__parleyTelegramAlertRunning = true;
  try {
    await processDueTelegramOrderAlerts();
  } catch (error) {
    console.warn("[telegram] el worker no pudo drenar alertas:", error);
  } finally {
    workerState.__parleyTelegramAlertRunning = false;
  }
}

/** Un solo temporizador por proceso; la reclamación en BD coordina réplicas. */
export function startTelegramAlertWorker(): void {
  if (workerState.__parleyTelegramAlertTimer) return;
  void drain();
  const timer = setInterval(() => void drain(), POLL_MS);
  timer.unref?.();
  workerState.__parleyTelegramAlertTimer = timer;
}
