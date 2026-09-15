import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASELINES = [
  "home-desktop.png",
  "home-mobile.png",
  "inbox-desktop.png",
  "inbox-mobile.png",
  "pipeline-desktop.png",
  "pipeline-mobile.png",
] as const;

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("V07 — validación visual automatizada", () => {
  const runner = source("scripts/visual-regression.mjs");
  const workflow = source(".github/workflows/ci.yml");
  const config = source("next.config.ts");
  const layout = source("src/app/visual-test/layout.tsx");
  const instrumentation = source("src/instrumentation.ts");
  const packageJson = JSON.parse(source("package.json")) as {
    scripts?: Record<string, string>;
  };

  it("versiona las seis capturas base de escritorio y móvil", () => {
    for (const baseline of BASELINES) {
      expect(
        existsSync(path.join(ROOT, "tests", "visual", "baseline", baseline)),
        baseline
      ).toBe(true);
      expect(runner).toContain(`name: "${baseline.replace(".png", "")}"`);
    }
  });

  it("usa fixtures y un reloj fijo para capturas deterministas", () => {
    expect(runner).toContain("page.route(\"**/api/**\"");
    expect(runner).toContain("page.clock.setFixedTime");
    expect(runner).toContain("2026-09-15T14:00:00.000Z");
    expect(runner).toContain("reducedMotion: \"reduce\"");
    expect(runner).toContain("timezoneId: \"America/Santiago\"");
  });

  it("mantiene las rutas visuales fuera del runtime normal", () => {
    expect(layout).toContain('process.env.PARLEY_VISUAL_TEST !== "1"');
    expect(config).toContain('process.env.PARLEY_VISUAL_TEST === "1"');
    expect(config).toContain('source: "/__visual/:path*"');
    expect(config).toContain('destination: "/visual-test/:path*"');
    expect(instrumentation).toContain('process.env.PARLEY_VISUAL_TEST === "1"');
  });

  it("ejecuta comparación visual en CI después de los gates normales", () => {
    expect(packageJson.scripts?.["test:visual"]).toBe("node scripts/visual-regression.mjs");
    expect(workflow).toContain("needs: gates");
    expect(workflow).toContain("validar regresión visual V07");
    expect(workflow).toContain("run: pnpm test:visual");
    expect(workflow).not.toContain('VISUAL_UPDATE: "1"');
  });

  it("conserva la captura actual cuando detecta una diferencia", () => {
    expect(runner).toContain("!baseline.equals(screenshot)");
    expect(runner).toContain("await writeFile(actualPath, screenshot)");
    expect(workflow).toContain("visual-differences");
    expect(workflow).toContain("scratch/visual");
  });
});
