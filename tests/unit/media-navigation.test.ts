import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("Biblioteca multimedia como sección principal", () => {
  it("aparece en el menú izquierdo con una ruta propia", () => {
    const nav = source("src/components/app-nav.tsx");
    expect(nav).toContain('{ href: "/media", label: "Multimedia", icon: Images }');
  });

  it("ya no se carga ni se muestra dentro de Automatización", () => {
    const automation = source(
      "src/components/automation/automation-client.tsx"
    );
    expect(automation).not.toContain("/api/agent/media");
    expect(automation).not.toContain("MediaLibrarySection");
  });

  it("la página independiente conserva la biblioteca y su API", () => {
    const page = source("src/app/(app)/media/page.tsx");
    const client = source(
      "src/components/media/media-library-client.tsx"
    );
    expect(page).toContain("<MediaLibraryClient />");
    expect(client).toContain('fetch("/api/agent/media")');
    expect(client).toContain("<MediaLibrarySection");
  });
});
