import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  customFieldKeyFromLabel,
  normalizeCustomFieldValue,
} from "@/lib/contact-metadata";

const schemaSource = readFileSync("src/lib/db/contact-metadata-schema.ts", "utf8");
const serverSource = readFileSync("src/server/contacts/contact-metadata.ts", "utf8");
const settingsRoute = readFileSync("src/app/api/settings/contact-metadata/route.ts", "utf8");
const contactRoute = readFileSync("src/app/api/contacts/[id]/metadata/route.ts", "utf8");
const settingsNav = readFileSync("src/components/settings/settings-nav.tsx", "utf8");
const contactPage = readFileSync("src/app/(app)/contacts/[id]/page.tsx", "utf8");

describe("C02 · etiquetas y campos personalizados", () => {
  it("crea un modelo persistente y consultable para clasificación de contactos", () => {
    for (const table of [
      "contact_tag",
      "contact_tag_assignment",
      "contact_custom_field",
      "contact_custom_field_value",
    ]) {
      expect(schemaSource).toContain(`\"${table}\"`);
    }
    expect(schemaSource.match(/organizationId:/g)?.length).toBe(4);
    expect(schemaSource).toContain("contact_custom_field_value_org_contact_field_uq");
  });

  it("aísla lectura y escritura por organización y valida pertenencia del contacto", () => {
    expect(serverSource).toContain("getContactById(organizationId, contactId)");
    expect(serverSource.match(/scoped\(/g)?.length).toBeGreaterThanOrEqual(10);
    expect(serverSource).toContain("La etiqueta no pertenece a esta organización");
    expect(serverSource).toContain("El campo no pertenece a esta organización");
    expect(serverSource).toContain("db.transaction");
  });

  it("las APIs toman siempre el tenant desde la sesión autenticada", () => {
    expect(settingsRoute).toContain("withAuth");
    expect(settingsRoute).toContain("session.organizationId");
    expect(contactRoute).toContain("withAuth");
    expect(contactRoute).toContain("getContactMetadata(session.organizationId, id)");
    expect(contactRoute).toContain("replaceContactMetadata(\n      session.organizationId");
  });

  it("normaliza claves estables y valida valores según el tipo configurado", () => {
    expect(customFieldKeyFromLabel("Tipo de vivienda")).toBe("tipo_de_vivienda");
    expect(customFieldKeyFromLabel("Comisión / %")).toBe("comision");
    expect(normalizeCustomFieldValue({ type: "number", options: [] }, "42.5")).toBe(42.5);
    expect(normalizeCustomFieldValue({ type: "boolean", options: [] }, "false")).toBe(false);
    expect(normalizeCustomFieldValue({ type: "date", options: [] }, "2026-09-16")).toBe("2026-09-16");
    expect(normalizeCustomFieldValue({ type: "select", options: ["Casa", "Depto"] }, "Casa")).toBe("Casa");
    expect(() => normalizeCustomFieldValue({ type: "select", options: ["Casa"] }, "Otro")).toThrow();
  });

  it("expone configuración y edición desde la interfaz existente", () => {
    expect(settingsNav).toContain('/settings/contact-data');
    expect(settingsNav).toContain('Datos de clientes');
    expect(contactPage).toContain("ContactMetadataEditor");
  });
});
