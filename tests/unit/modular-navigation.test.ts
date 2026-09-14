import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("V03 — navegación modular", () => {
  const nav = source("src/components/app-nav.tsx");

  it("presenta los módulos en el orden comercial acordado", () => {
    const labels = [
      "Inicio",
      "Bandeja",
      "Pipeline",
      "Contactos",
      "Agenda",
      "Sesiones",
      "Resultados",
      "Agente",
      "Multimedia",
      "Automatización",
      "Canales",
      "Equipo",
      "Configuración",
    ];

    let previous = -1;
    for (const label of labels) {
      const position = nav.indexOf(`label: "${label}"`);
      expect(position, label).toBeGreaterThan(previous);
      previous = position;
    }
  });

  it("separa Principal, Inteligencia y Administración", () => {
    expect(nav).toContain('label: "Principal"');
    expect(nav).toContain('label: "Inteligencia"');
    expect(nav).toContain('label: "Administración"');
    expect(nav).toContain('aria-label="Navegación principal"');
  });

  it("muestra Agenda únicamente con la bandera recibida del servidor", () => {
    expect(nav).toContain("...(agenda ? [AGENDA_ITEM] : [])");
    expect(source("src/app/(app)/layout.tsx")).toContain(
      "agenda={agendaEnabled()}"
    );
  });

  it("conserva Multimedia fuera de Automatización", () => {
    expect(nav).toContain('{ href: "/media", label: "Multimedia"');
    expect(nav.indexOf('label: "Multimedia"')).toBeLessThan(
      nav.indexOf('label: "Automatización"')
    );
  });

  it("usa rutas reales para los módulos nuevos", () => {
    for (const route of ["home", "sessions", "results", "channels"]) {
      expect(
        existsSync(path.join(ROOT, `src/app/(app)/${route}/page.tsx`)),
        route
      ).toBe(true);
    }
  });

  it("mantiene compatibles la raíz y el antiguo Laboratorio", () => {
    expect(source("src/app/page.tsx")).toContain('redirect("/home")');
    expect(source("src/app/(app)/lab/page.tsx")).toContain(
      'redirect("/results")'
    );
    expect(source("src/app/(app)/results/page.tsx")).toContain("LabClient");
  });

  it("marca una sola familia administrativa como activa", () => {
    expect(nav).toContain('"/settings/whatsapp"');
    expect(nav).toContain('"/settings/messenger"');
    expect(nav).toContain('"/settings/templates"');
    expect(nav).toContain('match: ["/settings/team"]');
    expect(nav).toContain('"/settings/branding"');
    expect(nav).toContain('"/settings/calendar"');
    expect(nav).toContain('"/settings/ads"');
  });

  it("expone el estado actual a tecnologías de asistencia", () => {
    expect(nav).toContain('aria-current={active ? "page" : undefined}');
    expect(nav).toContain('aria-hidden="true"');
  });

  it("resuelve los canales en servidor sin exponer secretos", () => {
    const channels = source("src/app/(app)/channels/page.tsx");
    expect(channels).toContain("enabledChannels()");
    expect(channels).toContain("CHANNEL_ORDER.map");
    expect(channels).not.toMatch(/token|secret|credential/i);
  });

  it("documenta límites para no fingir funciones futuras", () => {
    const sessions = source("src/app/(app)/sessions/page.tsx");
    expect(sessions).toContain("Módulo preparado");
    expect(sessions).toContain("tarea funcional independiente");
  });
});
