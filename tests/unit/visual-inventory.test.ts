import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const inventory = source("docs/visual-inventory-parley.md");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function countInFiles(fragment: string, relativePaths: string[]): number {
  return relativePaths.reduce(
    (total, relativePath) => total + source(relativePath).split(fragment).length - 1,
    0
  );
}

const UI_FILES = [
  "src/components/lab/lab-client.tsx",
  "src/components/pipeline/pipeline-client.tsx",
  "src/components/media/media-library-client.tsx",
  "src/components/agent/agent-client.tsx",
  "src/components/automation/automation-client.tsx",
  "src/components/inbox/conversation-list.tsx",
  "src/components/inbox/inbox-client.tsx",
  "src/components/inbox/composer.tsx",
  "src/components/inbox/contact-panel.tsx",
  "src/components/inbox/template-sender.tsx",
  "src/components/contacts/contacts-client.tsx",
  "src/components/contacts/start-conversation.tsx",
  "src/components/contacts/new-contact-dialog.tsx",
  "src/components/pipeline/stage-manager.tsx",
  "src/components/pipeline/loss-reason-dialog.tsx",
  "src/components/pipeline/amount-dialog.tsx",
  "src/components/pipeline/lead-drawer.tsx",
  "src/components/settings/ads-client.tsx",
  "src/components/settings/agenda-client.tsx",
  "src/components/settings/branding-client.tsx",
  "src/components/settings/templates-client.tsx",
  "src/components/settings/favicon-card.tsx",
  "src/components/settings/messenger-client.tsx",
  "src/components/settings/team-client.tsx",
  "src/components/settings/whatsapp-wizard.tsx",
  "src/components/automation/quote-catalog-section.tsx",
  "src/components/automation/telegram-alert-section.tsx",
  "src/components/app-shell.tsx",
  "src/app/(app)/bookings/page.tsx",
  "src/app/(app)/settings/layout.tsx",
];

describe("V01 — inventario visual de Parley", () => {
  it("mapea todas las rutas visibles sin borrar módulos opcionales", () => {
    const routes = [
      "/inbox",
      "/pipeline",
      "/bookings",
      "/contacts",
      "/agent",
      "/media",
      "/automation",
      "/lab",
      "/settings/whatsapp",
      "/settings/messenger",
      "/settings/branding",
      "/settings/templates",
      "/settings/team",
      "/settings/calendar",
      "/settings/ads",
      "/login",
      "/register",
    ];
    for (const route of routes) expect(inventory).toContain(`\`${route}\``);
  });

  it("cada archivo señalado por el mapa sigue existiendo", () => {
    const referenced = [
      "src/lib/branding.ts",
      "src/components/brand-mark.tsx",
      "src/lib/brand.ts",
      "src/lib/favicon.ts",
      "src/components/app-nav.tsx",
      "src/components/app-shell.tsx",
      "src/app/globals.css",
      "tailwind.config.ts",
    ];
    for (const relativePath of referenced) {
      expect(existsSync(path.join(ROOT, relativePath)), relativePath).toBe(true);
      expect(inventory).toContain(`\`${relativePath}\``);
    }
  });

  it("conserva el diagnóstico histórico aunque V02 resuelva el nombre", () => {
    expect(inventory).toContain("Referencias visibles que V02 debe convertir a Parley");
    expect(source("src/lib/branding.ts")).toContain("PARLEY_BRAND.name");
    expect(source("src/components/settings/branding-client.tsx")).toContain(
      'placeholder="Parley"'
    );
  });

  it("protege identificadores compatibles que no son identidad visual", () => {
    expect(source("src/lib/theme.ts")).toContain('"vocero-theme"');
    expect(source("src/components/inbox/inbox-client.tsx")).toContain(
      '"vocero.panelOpen"'
    );
    expect(source("src/lib/meta/capi.ts")).toContain('"vocero-crm"');
    expect(inventory).toContain("Identificadores históricos que V02 debe conservar");
  });

  it("congela los conteos del diagnóstico para detectar un inventario obsoleto", () => {
    expect(
      countInFiles("border-b px-4 py-3 sm:px-6 sm:py-4", UI_FILES)
    ).toBe(7);
    expect(
      countInFiles("text-[17px] font-bold tracking-tight", UI_FILES)
    ).toBe(9);
    expect(countInFiles("<select", UI_FILES)).toBe(11);
    expect(countInFiles("fixed inset-0", UI_FILES)).toBe(9);
    expect(countInFiles("bg-knob shadow-sm transition-transform", UI_FILES)).toBe(4);
  });
});
