import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = hex.match(/[a-f\d]{2}/gi);
  if (!rgb || rgb.length !== 3) throw new Error(`Color inválido: ${hex}`);
  const values = rgb.map((part) => channel(Number.parseInt(part, 16)));
  const r = values[0] ?? 0;
  const g = values[1] ?? 0;
  const b = values[2] ?? 0;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

describe("V06 — experiencia móvil y accesibilidad", () => {
  const accessibility = source("src/app/accessibility.css");
  const layout = source("src/app/layout.tsx");
  const globals = source("src/app/globals.css");
  const inbox = source("src/components/inbox/inbox-client.tsx");
  const contactPanel = source("src/components/inbox/contact-panel.tsx");
  const pipeline = source("src/components/pipeline/pipeline-client.tsx");
  const dialog = source("src/components/ui/dialog.tsx");

  it("carga la capa V06 después del sistema visual", () => {
    expect(layout.indexOf('import "./accessibility.css";')).toBeGreaterThan(
      layout.indexOf('import "./globals.css";')
    );
  });

  it("mantiene la Bandeja como maestro-detalle en móvil", () => {
    expect(inbox).toContain('selected && "max-md:hidden"');
    expect(inbox).toContain('!selected && "max-md:hidden"');
    expect(inbox).toContain('aria-label="Volver a las conversaciones"');
    expect(inbox).toContain('aria-label="Mostrar detalles"');
    expect(contactPanel).toContain('aria-label="Ocultar panel"');
  });

  it("mantiene el Pipeline desplazable y utilizable sin arrastre", () => {
    expect(pipeline).toContain("snap-x snap-mandatory overflow-x-auto");
    expect(pipeline).toContain('e.key === "Enter" || e.key === " "');
    expect(accessibility).toContain(".snap-start.w-64");
    expect(accessibility).toContain("calc(100vw - 1.5rem)");
  });

  it("garantiza objetivos táctiles de al menos 44 px", () => {
    expect(accessibility).toContain("min-height: 44px");
    expect(accessibility).toContain("min-width: 44px");
    expect(accessibility).toContain('[role="button"]');
    expect(accessibility).toContain('[role="switch"]');
    expect(accessibility).toContain("a[aria-label]");
  });

  it("mantiene formularios legibles y foco visible", () => {
    expect(accessibility).toContain("font-size: 16px !important");
    expect(accessibility).toContain("select,");
    expect(accessibility).toContain(":focus-visible");
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain('event.key !== "Tab"');
    expect(dialog).toContain('aria-modal="true"');
  });

  it("respeta reducción de movimiento existente", () => {
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("el texto auxiliar supera WCAG AA en superficies claras frecuentes", () => {
    expect(contrast("#5f6d83", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#5f6d83", "#e9eef8")).toBeGreaterThanOrEqual(4.5);
    expect(accessibility).toContain("--text-3: #5f6d83");
  });

  it("el texto auxiliar oscuro supera WCAG AA sobre el hover del tema oscuro", () => {
    expect(contrast("#7d90ba", "#172346")).toBeGreaterThanOrEqual(4.5);
    expect(accessibility).toContain("--text-3: #7d90ba");
  });
});
