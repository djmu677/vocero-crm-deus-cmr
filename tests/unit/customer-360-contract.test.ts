import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const querySource = readFileSync(
  "src/server/contacts/customer-360.ts",
  "utf8"
);
const routeSource = readFileSync(
  "src/app/api/contacts/[id]/360/route.ts",
  "utf8"
);
const viewSource = readFileSync(
  "src/components/contacts/customer-360-client.tsx",
  "utf8"
);

describe("C01 · ficha 360 del cliente", () => {
  it("aísla todas las lecturas comerciales por organización", () => {
    expect(querySource).toContain("getContactById(organizationId, contactId)");
    expect(querySource).toContain("getContactStage(organizationId, contactId)");
    expect(querySource.match(/scoped\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(querySource).toContain("eq(schema.conversation.organizationId, organizationId)");
    expect(querySource).toContain("eq(schema.mediaAsset.organizationId, organizationId)");
    expect(querySource).toContain("eq(schema.member.organizationId, organizationId)");
  });

  it("la ruta usa únicamente la organización de la sesión autenticada", () => {
    expect(routeSource).toContain("withAuth");
    expect(routeSource).toContain("getCustomer360(session.organizationId, id)");
    expect(routeSource).toContain('apiError(404, "not_found"');
  });

  it("reúne los bloques definidos por C01 en una sola pantalla", () => {
    for (const heading of [
      "Contacto",
      "Datos de la ficha",
      "Notas",
      "Tareas",
      "Conversaciones",
      "Pipeline",
      "Pedidos",
      "Citas",
      "Archivos",
    ]) {
      expect(viewSource).toContain(`title=\"${heading}\"`);
    }
    expect(viewSource).toContain('label="Responsable"');
    expect(viewSource).toContain('label="Fuente"');
  });

  it("mantiene C01 en modo lectura y no inventa tareas ni responsable", () => {
    expect(querySource).toContain("responsible: null");
    expect(querySource).toContain("tasks: []");
    expect(querySource).not.toMatch(/insert\(schema\.(task|note)/);
    expect(querySource).not.toMatch(/update\(schema\.(task|note)/);
  });
});
