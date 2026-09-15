import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ConversationDto } from "@/lib/types";
import { pendingConversationSummary } from "@/server/home/summary";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function conversation(
  id: string,
  unreadCount: number,
  handoffAt: string | null = null
): ConversationDto {
  return {
    id,
    channel: "whatsapp",
    contact: { id: `contact-${id}`, name: `Contacto ${id}`, phone: null },
    stageName: null,
    aiEnabled: true,
    handoffAt,
    handoffReason: handoffAt ? "cliente" : null,
    lastInboundAt: null,
    lastMessageAt: null,
    unreadCount,
    windowOpen: true,
    windowRemainingMs: 0,
    preview: null,
  };
}

describe("V04 — resumen de Inicio", () => {
  it("considera pendiente un mensaje sin leer o un handoff", () => {
    const result = pendingConversationSummary([
      conversation("read", 0),
      conversation("unread", 3),
      conversation("handoff", 0, "2026-09-15T10:00:00.000Z"),
    ]);

    expect(result.count).toBe(2);
    expect(result.unreadMessages).toBe(3);
    expect(result.items.map((item) => item.id)).toEqual(["unread", "handoff"]);
  });

  it("limita la portada sin alterar los totales", () => {
    const result = pendingConversationSummary(
      Array.from({ length: 8 }, (_, index) => conversation(String(index), 1))
    );
    expect(result.count).toBe(8);
    expect(result.unreadMessages).toBe(8);
    expect(result.items).toHaveLength(5);
  });

  it("consulta únicamente con el organizationId de la sesión", () => {
    const page = source("src/app/(app)/home/page.tsx");
    const server = source("src/server/home/summary.ts");
    expect(page).toContain("getHomeSummary(session.organizationId");
    expect(server.match(/scoped\(/g)?.length).toBeGreaterThanOrEqual(10);
    expect(server).toContain("pendingRowsPromise");
    expect(server).toContain("pendingTotalsPromise");
    expect(server).toContain(".limit(MAX_ITEMS)");
  });

  it("excluye conversaciones, citas y actividad de laboratorio de prueba", () => {
    const server = source("src/server/home/summary.ts");
    expect(server.match(/isTest, false/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("no toca las tablas de Agenda cuando la función está apagada", () => {
    const server = source("src/server/home/summary.ts");
    expect(server.match(/options\.agenda/g)?.length).toBeGreaterThanOrEqual(2);
    expect(server).toContain("Promise.resolve([])");
    expect(server).toContain("Promise.resolve([{ value: 0 }])");
  });

  it("muestra todas las prioridades operativas solicitadas", () => {
    const dashboard = source("src/components/home/home-dashboard.tsx");
    for (const label of [
      "Conversaciones pendientes",
      "Prioridad alta",
      "Pedidos nuevos",
      "Citas y entregas",
      "Fallos recientes",
      "Última prueba",
    ]) {
      expect(dashboard, label).toContain(label);
    }
  });

  it("describe como 24 horas lo que no calcula por día calendario", () => {
    const dashboard = source("src/components/home/home-dashboard.tsx");
    expect(dashboard.match(/Últimas 24 horas/g)).toHaveLength(2);
    expect(dashboard).toContain("Próximas 24 horas");
  });

  it("mantiene Inicio como página dinámica autenticada", () => {
    const page = source("src/app/(app)/home/page.tsx");
    expect(page).toContain('dynamic = "force-dynamic"');
    expect(page).toContain("getSessionOrNull()");
    expect(page).toContain('redirect("/login")');
  });
});
