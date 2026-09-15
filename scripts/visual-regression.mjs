import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = process.env.VISUAL_PORT ?? "3010";
const BASE_URL = process.env.VISUAL_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const UPDATE = process.argv.includes("--update") || process.env.VISUAL_UPDATE === "1";
const BASELINE_DIR = path.join(ROOT, "tests", "visual", "baseline");
const ACTUAL_DIR = path.join(ROOT, "scratch", "visual");

const STAGES = [
  {
    id: "stage-new",
    name: "Nuevo",
    position: 0,
    kind: "open",
    botMoveEnabled: true,
    botMoveCriteria: null,
    botStageKey: "conversation",
  },
  {
    id: "stage-interest",
    name: "Interesado",
    position: 1,
    kind: "open",
    botMoveEnabled: true,
    botMoveCriteria: "Pidió precio o disponibilidad",
    botStageKey: "interested",
  },
  {
    id: "stage-order",
    name: "Pedido",
    position: 2,
    kind: "open",
    botMoveEnabled: true,
    botMoveCriteria: "Confirmó intención de compra",
    botStageKey: "order",
  },
  {
    id: "stage-won",
    name: "Ganado",
    position: 3,
    kind: "won",
    botMoveEnabled: false,
    botMoveCriteria: null,
    botStageKey: null,
  },
  {
    id: "stage-lost",
    name: "Perdido",
    position: 4,
    kind: "lost",
    botMoveEnabled: false,
    botMoveCriteria: null,
    botStageKey: null,
  },
];

const CONVERSATIONS = [
  {
    id: "conv-ana",
    channel: "whatsapp",
    contact: { id: "contact-ana", name: "Ana Torres", phone: "+56961234567" },
    stageName: "Interesado",
    aiEnabled: true,
    handoffAt: null,
    handoffReason: null,
    lastInboundAt: "2026-09-15T13:48:00.000Z",
    lastMessageAt: "2026-09-15T13:50:00.000Z",
    unreadCount: 3,
    windowOpen: true,
    windowRemainingMs: 7_200_000,
    preview: "¿Pueden entregar mañana por la tarde?",
  },
  {
    id: "conv-diego",
    channel: "instagram",
    contact: { id: "contact-diego", name: "Diego Soto", phone: null },
    stageName: "Nuevo",
    aiEnabled: false,
    handoffAt: "2026-09-15T13:30:00.000Z",
    handoffReason: "cliente",
    lastInboundAt: "2026-09-15T13:29:00.000Z",
    lastMessageAt: "2026-09-15T13:30:00.000Z",
    unreadCount: 2,
    windowOpen: true,
    windowRemainingMs: 10_800_000,
    preview: "Quiero hablar con una persona.",
  },
  {
    id: "conv-camila",
    channel: "messenger",
    contact: { id: "contact-camila", name: "Camila Rojas", phone: null },
    stageName: "Pedido",
    aiEnabled: true,
    handoffAt: null,
    handoffReason: null,
    lastInboundAt: "2026-09-15T12:45:00.000Z",
    lastMessageAt: "2026-09-15T12:48:00.000Z",
    unreadCount: 0,
    windowOpen: true,
    windowRemainingMs: 14_400_000,
    preview: "Gracias, quedo atenta a la entrega.",
  },
];

const MESSAGES = [
  {
    id: "message-1",
    conversationId: "conv-ana",
    direction: "in",
    type: "text",
    text: "Hola, me interesa el sofá azul. ¿Tienen disponibilidad?",
    status: "read",
    error: null,
    aiGenerated: false,
    origin: "operator",
    media: null,
    createdAt: "2026-09-15T13:42:00.000Z",
  },
  {
    id: "message-2",
    conversationId: "conv-ana",
    direction: "out",
    type: "text",
    text: "Sí, Ana. Tenemos disponibilidad y podemos coordinar el despacho.",
    status: "read",
    error: null,
    aiGenerated: true,
    origin: "ai",
    media: null,
    createdAt: "2026-09-15T13:44:00.000Z",
  },
  {
    id: "message-3",
    conversationId: "conv-ana",
    direction: "in",
    type: "text",
    text: "Perfecto. ¿Pueden entregar mañana por la tarde?",
    status: "read",
    error: null,
    aiGenerated: false,
    origin: "operator",
    media: null,
    createdAt: "2026-09-15T13:48:00.000Z",
  },
  {
    id: "message-4",
    conversationId: "conv-ana",
    direction: "out",
    type: "text",
    text: "Claro. Voy a dejar la preferencia anotada para coordinarla contigo.",
    status: "delivered",
    error: null,
    aiGenerated: false,
    origin: "operator",
    media: null,
    createdAt: "2026-09-15T13:50:00.000Z",
  },
];

const LEADS = [
  {
    id: "lead-diego",
    stageId: "stage-new",
    position: 0,
    lastActivityAt: "2026-09-15T13:30:00.000Z",
    contact: { id: "contact-diego", name: "Diego Soto", phone: "+56970001122" },
    conversationId: "conv-diego",
    amountCents: null,
    currency: null,
    priority: "media",
  },
  {
    id: "lead-ana",
    stageId: "stage-interest",
    position: 0,
    lastActivityAt: "2026-09-15T13:50:00.000Z",
    contact: { id: "contact-ana", name: "Ana Torres", phone: "+56961234567" },
    conversationId: "conv-ana",
    amountCents: 1650000,
    currency: "MXN",
    priority: "alta",
  },
  {
    id: "lead-camila",
    stageId: "stage-order",
    position: 0,
    lastActivityAt: "2026-09-15T12:48:00.000Z",
    contact: { id: "contact-camila", name: "Camila Rojas", phone: "+56973334455" },
    conversationId: "conv-camila",
    amountCents: 2890000,
    currency: "MXN",
    priority: "alta",
  },
  {
    id: "lead-luis",
    stageId: "stage-won",
    position: 0,
    lastActivityAt: "2026-09-15T11:20:00.000Z",
    contact: { id: "contact-luis", name: "Luis Pérez", phone: "+56976667788" },
    conversationId: "conv-luis",
    amountCents: 2200000,
    currency: "MXN",
    priority: "baja",
  },
];

const CASES = [
  { name: "home-desktop", path: "/__visual/home", viewport: { width: 1440, height: 1000 }, mobile: false },
  { name: "home-mobile", path: "/__visual/home", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "inbox-desktop", path: "/__visual/inbox?contact=contact-ana", viewport: { width: 1440, height: 1000 }, mobile: false },
  { name: "inbox-mobile", path: "/__visual/inbox?contact=contact-ana", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "pipeline-desktop", path: "/__visual/pipeline", viewport: { width: 1440, height: 1000 }, mobile: false },
  { name: "pipeline-mobile", path: "/__visual/pipeline", viewport: { width: 390, height: 844 }, mobile: true },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 12);

function startServer() {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(
    pnpm,
    ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", PORT],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PARLEY_VISUAL_TEST: "1",
        CHANNELS: "whatsapp,instagram,messenger",
        AGENDA: "on",
        NEXT_TELEMETRY_DISABLED: "1",
        TZ: "America/Santiago",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    }
  );

  let log = "";
  const append = (chunk) => {
    log = `${log}${chunk}`.slice(-20_000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.visualLog = () => log;
  return child;
}

async function waitForServer(server) {
  let exited = false;
  server.once("exit", () => {
    exited = true;
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (exited) throw new Error(`Next terminó antes de iniciar.\n${server.visualLog()}`);
    try {
      const response = await fetch(`${BASE_URL}/__visual/home`, { redirect: "manual" });
      if (response.ok) return;
    } catch {
      // El puerto todavía no escucha.
    }
    await sleep(500);
  }
  throw new Error(`Next no respondió a tiempo.\n${server.visualLog()}`);
}

function stopServer(server) {
  if (!server?.pid) return;
  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    try {
      server.kill("SIGTERM");
    } catch {
      // Ya terminó.
    }
  }
}

async function fulfillJson(route, payload, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(payload),
  });
}

async function installFixtures(page, unexpected) {
  await page.addInitScript(() => {
    class VisualEventSource {
      constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.withCredentials = false;
        this.onopen = null;
        this.onerror = null;
        this.onmessage = null;
        queueMicrotask(() => this.onopen?.(new Event("open")));
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
      close() {
        this.readyState = 2;
      }
    }
    Object.defineProperty(window, "EventSource", {
      configurable: true,
      writable: true,
      value: VisualEventSource,
    });
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method === "GET" && pathname === "/api/conversations") {
      return fulfillJson(route, { conversations: CONVERSATIONS });
    }
    if (method === "GET" && pathname === "/api/conversations/conv-ana/messages") {
      return fulfillJson(route, { messages: MESSAGES });
    }
    if (method === "GET" && pathname === "/api/templates") {
      return fulfillJson(route, {
        templates: [
          {
            id: "template-1",
            name: "confirmar_entrega",
            language: "es",
            category: "UTILITY",
            body: "Hola {{1}}, confirmamos tu entrega para mañana.",
            status: "approved",
            rejectionReason: null,
          },
          {
            id: "template-2",
            name: "seguimiento",
            language: "es",
            category: "MARKETING",
            body: "Hola {{1}}, ¿sigues interesado en tu pedido?",
            status: "approved",
            rejectionReason: null,
          },
        ],
      });
    }
    if (method === "GET" && pathname === "/api/contacts/contact-ana") {
      return fulfillJson(route, {
        contact: {
          id: "contact-ana",
          name: "Ana Torres",
          phone: "+56961234567",
          notes: "Prefiere entrega por la tarde y contacto por WhatsApp.",
          ficha: { Comuna: "Ñuñoa", Color: "Azul marino", Cantidad: 1 },
        },
        stage: { id: "stage-interest", name: "Interesado" },
        lead: { id: "lead-ana" },
      });
    }
    if (method === "GET" && pathname === "/api/pipeline/stages") {
      return fulfillJson(route, { stages: STAGES });
    }
    if (method === "GET" && pathname === "/api/agent/profile") {
      return fulfillJson(route, { profile: { enabled: true }, aiConfigured: true });
    }
    if (method === "GET" && pathname === "/api/pipeline/board") {
      return fulfillJson(route, { stages: STAGES, leads: LEADS, currency: "MXN" });
    }
    if (method !== "GET") {
      return fulfillJson(route, { ok: true });
    }

    unexpected.add(`${method} ${pathname}`);
    return fulfillJson(route, {});
  });
}

async function captureCase(browser, testCase, failures) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    deviceScaleFactor: 1,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    colorScheme: "light",
    reducedMotion: "reduce",
    isMobile: testCase.mobile,
    hasTouch: testCase.mobile,
  });
  const page = await context.newPage();
  const unexpected = new Set();
  await installFixtures(page, unexpected);

  await page.goto(`${BASE_URL}${testCase.path}`, { waitUntil: "networkidle" });
  await page.locator("main").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    document.documentElement.dataset.theme = "light";
    await document.fonts.ready;
  });
  await page.waitForTimeout(150);

  const screenshot = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  const baselinePath = path.join(BASELINE_DIR, `${testCase.name}.png`);
  const actualPath = path.join(ACTUAL_DIR, `${testCase.name}.png`);

  if (UPDATE) {
    await writeFile(baselinePath, screenshot);
    console.log(`baseline ${testCase.name}: ${hash(screenshot)}`);
  } else {
    let baseline = null;
    try {
      baseline = await readFile(baselinePath);
    } catch {
      failures.push(`${testCase.name}: falta ${path.relative(ROOT, baselinePath)}`);
    }
    if (baseline && !baseline.equals(screenshot)) {
      await writeFile(actualPath, screenshot);
      failures.push(
        `${testCase.name}: esperado ${hash(baseline)}, actual ${hash(screenshot)} ` +
          `(captura en ${path.relative(ROOT, actualPath)})`
      );
    } else if (baseline) {
      console.log(`ok ${testCase.name}: ${hash(screenshot)}`);
    }
  }

  if (unexpected.size > 0) {
    failures.push(
      `${testCase.name}: APIs sin fixture: ${Array.from(unexpected).sort().join(", ")}`
    );
  }

  await context.close();
}

async function main() {
  await mkdir(BASELINE_DIR, { recursive: true });
  await rm(ACTUAL_DIR, { recursive: true, force: true });
  await mkdir(ACTUAL_DIR, { recursive: true });

  const server = startServer();
  let browser;
  const failures = [];

  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: true });
    for (const testCase of CASES) {
      await captureCase(browser, testCase, failures);
    }
  } finally {
    await browser?.close();
    stopServer(server);
  }

  if (failures.length > 0) {
    throw new Error(`Regresión visual detectada:\n- ${failures.join("\n- ")}`);
  }

  console.log(
    UPDATE
      ? `Actualizadas ${CASES.length} capturas base.`
      : `Validadas ${CASES.length} capturas visuales.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
