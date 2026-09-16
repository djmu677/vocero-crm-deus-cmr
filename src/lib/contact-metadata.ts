export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type ContactTagDto = {
  id: string;
  name: string;
};

export type ContactCustomFieldDto = {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  position: number;
};

export type ContactMetadataDefinitionsDto = {
  tags: ContactTagDto[];
  fields: ContactCustomFieldDto[];
};

export type ContactMetadataDto = ContactMetadataDefinitionsDto & {
  tagIds: string[];
  values: Array<{ fieldId: string; value: unknown }>;
};

export class InvalidCustomFieldValueError extends Error {}

export function customFieldKeyFromLabel(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return normalized || "campo";
}

export function normalizeCustomFieldValue(
  field: Pick<ContactCustomFieldDto, "type" | "options">,
  raw: unknown
): unknown | null {
  if (raw === null || raw === undefined || raw === "") return null;

  switch (field.type) {
    case "text": {
      if (typeof raw !== "string") throw new InvalidCustomFieldValueError("Debe ser texto");
      const value = raw.trim();
      if (!value) return null;
      if (value.length > 2000) throw new InvalidCustomFieldValueError("Máximo 2000 caracteres");
      return value;
    }
    case "number": {
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (!Number.isFinite(value)) throw new InvalidCustomFieldValueError("Debe ser un número válido");
      return value;
    }
    case "date": {
      if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        throw new InvalidCustomFieldValueError("Debe usar una fecha AAAA-MM-DD");
      }
      const [year, month, day] = raw.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new InvalidCustomFieldValueError("Fecha inválida");
      }
      return raw;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      throw new InvalidCustomFieldValueError("Debe ser sí o no");
    }
    case "select": {
      if (typeof raw !== "string" || !field.options.includes(raw)) {
        throw new InvalidCustomFieldValueError("Opción no permitida");
      }
      return raw;
    }
  }
}
