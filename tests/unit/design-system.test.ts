import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_BRANDING } from "@/lib/branding";
import {
  contrastRatio,
  MIN_CONTRAST,
  PARLEY_BRAND,
  VISUAL_SCALE,
} from "@/lib/design-system";

function source(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("V02 — identidad Parley", () => {
  it("es la marca predeterminada sin desactivar el white-label", () => {
    expect(DEFAULT_BRANDING).toMatchObject({
      name: "Parley",
      accent: PARLEY_BRAND.primary,
    });
    expect(source("src/components/settings/branding-client.tsx")).toContain(
      'placeholder="Parley"'
    );
  });

  it("la paleta contractual coincide con los tokens CSS claros", () => {
    const css = source("src/app/globals.css");
    expect(css).toContain(`--accent: ${PARLEY_BRAND.primary}`);
    expect(css).toContain(`--accent-hover: ${PARLEY_BRAND.primaryHover}`);
    expect(css).toContain(`--accent-soft: ${PARLEY_BRAND.primarySoft}`);
    expect(css).toContain(`--accent-tint: ${PARLEY_BRAND.primaryTint}`);
    expect(css).toContain(`--accent-text: ${PARLEY_BRAND.primaryText}`);
    expect(css).toContain(`--brand-signal: ${PARLEY_BRAND.signal}`);
  });

  it("el texto del botón y del tint supera 4.5:1", () => {
    expect(
      contrastRatio(PARLEY_BRAND.primaryForeground, PARLEY_BRAND.primary)
    ).toBeGreaterThanOrEqual(MIN_CONTRAST.bodyText);
    expect(
      contrastRatio(PARLEY_BRAND.primaryText, PARLEY_BRAND.primaryTint)
    ).toBeGreaterThanOrEqual(MIN_CONTRAST.bodyText);
  });

  it("los cuatro estados claros mantienen contraste de texto", () => {
    for (const [text, tint] of [
      ["#157a41", "#e9f7ee"],
      ["#935f0b", "#fef6e6"],
      ["#b73535", "#fdf0f0"],
      ["#1d4ed8", "#eff6ff"],
    ] as const) {
      expect(contrastRatio(text, tint)).toBeGreaterThanOrEqual(
        MIN_CONTRAST.bodyText
      );
    }
  });
});

describe("V02 — escala y tipografía", () => {
  it("usa una escala de espacio cerrada y controles 32/36/40", () => {
    expect(VISUAL_SCALE.spacing).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(VISUAL_SCALE.controlHeight).toEqual({
      compact: 32,
      default: 36,
      comfortable: 40,
    });
    expect(VISUAL_SCALE.iconSize).toEqual({
      compact: 16,
      default: 18,
      prominent: 20,
    });
  });

  it("declara los roles tipográficos y conserva las tres familias", () => {
    const css = source("src/app/globals.css");
    const layout = source("src/app/layout.tsx");
    for (const role of [
      ".page-title",
      ".section-title",
      ".body-copy",
      ".caption",
      ".kicker",
    ]) {
      expect(css).toContain(role);
    }
    expect(layout).toContain("Archivo");
    expect(layout).toContain("Instrument_Serif");
    expect(layout).toContain("IBM_Plex_Mono");
  });
});

describe("V02 — primitivas para módulos futuros", () => {
  it("botón y campos comparten altura y foco de tres píxeles", () => {
    for (const file of ["button.tsx", "input.tsx", "select.tsx"]) {
      const component = source(`src/components/ui/${file}`);
      expect(component).toContain("h-control");
      expect(component).toContain("ring-[3px]");
    }
  });

  it("Switch expone estado semántico y foco de teclado", () => {
    const component = source("src/components/ui/switch.tsx");
    expect(component).toContain('role="switch"');
    expect(component).toContain("aria-checked={checked}");
    expect(component).toContain("focus-visible:ring-[3px]");
  });

  it("Alert define las cuatro familias y no depende solo del color", () => {
    const component = source("src/components/ui/alert.tsx");
    for (const variant of ["info", "success", "warning", "danger"]) {
      expect(component).toContain(`${variant}:`);
    }
    expect(component).toContain("AlertTitle");
    expect(component).toContain("AlertDescription");
  });
});

describe("V02 — compatibilidad", () => {
  it("retira Vocero de las superficies visibles ya inventariadas", () => {
    for (const file of [
      "src/lib/branding.ts",
      "src/components/brand-mark.tsx",
      "src/components/settings/branding-client.tsx",
      "src/components/inbox/contact-panel.tsx",
      "src/components/settings/messenger-client.tsx",
      "src/app/(auth)/layout.tsx",
    ]) {
      expect(source(file), file).not.toContain("Vocero");
    }
  });

  it("no rompe preferencias ni el identificador de Meta", () => {
    expect(source("src/lib/theme.ts")).toContain('"vocero-theme"');
    expect(source("src/components/inbox/inbox-client.tsx")).toContain(
      '"vocero.panelOpen"'
    );
    expect(source("src/lib/meta/capi.ts")).toContain('"vocero-crm"');
  });
});
