import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import {
  customFieldKeyFromLabel,
  InvalidCustomFieldValueError,
  normalizeCustomFieldValue,
  type ContactCustomFieldDto,
  type ContactMetadataDefinitionsDto,
  type ContactMetadataDto,
  type CustomFieldType,
} from "@/lib/contact-metadata";
import { getContactById } from "@/server/contacts";

export class ContactMetadataError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function cleanName(value: string, max: number) {
  const result = value.trim().replace(/\s+/g, " ");
  if (!result) throw new ContactMetadataError(422, "invalid_name", "El nombre es obligatorio");
  if (result.length > max) {
    throw new ContactMetadataError(422, "invalid_name", `Máximo ${max} caracteres`);
  }
  return result;
}

function cleanOptions(type: CustomFieldType, options: string[] | undefined) {
  if (type !== "select") return [];
  const cleaned = Array.from(
    new Set((options ?? []).map((value) => value.trim()).filter(Boolean))
  );
  if (cleaned.length === 0) {
    throw new ContactMetadataError(422, "invalid_options", "Un campo de lista necesita opciones");
  }
  if (cleaned.length > 50 || cleaned.some((value) => value.length > 80)) {
    throw new ContactMetadataError(422, "invalid_options", "Máximo 50 opciones de 80 caracteres");
  }
  return cleaned;
}

function serializeField(row: typeof schema.contactCustomField.$inferSelect): ContactCustomFieldDto {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    options: row.options ?? [],
    position: row.position,
  };
}

export async function listContactMetadataDefinitions(
  organizationId: string
): Promise<ContactMetadataDefinitionsDto> {
  const db = getDb();
  const [tags, fields] = await Promise.all([
    db
      .select({ id: schema.contactTag.id, name: schema.contactTag.name })
      .from(schema.contactTag)
      .where(scoped(schema.contactTag.organizationId, organizationId))
      .orderBy(asc(schema.contactTag.name)),
    db
      .select()
      .from(schema.contactCustomField)
      .where(
        scoped(
          schema.contactCustomField.organizationId,
          organizationId,
          eq(schema.contactCustomField.active, true)
        )
      )
      .orderBy(asc(schema.contactCustomField.position), asc(schema.contactCustomField.label)),
  ]);
  return { tags, fields: fields.map(serializeField) };
}

export async function getContactMetadata(
  organizationId: string,
  contactId: string
): Promise<ContactMetadataDto | null> {
  const contact = await getContactById(organizationId, contactId);
  if (!contact) return null;
  const db = getDb();
  const [definitions, assignments, values] = await Promise.all([
    listContactMetadataDefinitions(organizationId),
    db
      .select({ tagId: schema.contactTagAssignment.tagId })
      .from(schema.contactTagAssignment)
      .where(
        scoped(
          schema.contactTagAssignment.organizationId,
          organizationId,
          eq(schema.contactTagAssignment.contactId, contactId)
        )
      ),
    db
      .select({
        fieldId: schema.contactCustomFieldValue.fieldId,
        value: schema.contactCustomFieldValue.value,
      })
      .from(schema.contactCustomFieldValue)
      .where(
        scoped(
          schema.contactCustomFieldValue.organizationId,
          organizationId,
          eq(schema.contactCustomFieldValue.contactId, contactId)
        )
      ),
  ]);
  return {
    ...definitions,
    tagIds: assignments.map((row) => row.tagId),
    values,
  };
}

export async function createContactTag(organizationId: string, rawName: string) {
  const db = getDb();
  const name = cleanName(rawName, 60);
  const existing = await db
    .select({ id: schema.contactTag.id })
    .from(schema.contactTag)
    .where(
      scoped(
        schema.contactTag.organizationId,
        organizationId,
        eq(schema.contactTag.name, name)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw new ContactMetadataError(409, "tag_exists", "Ya existe una etiqueta con ese nombre");
  }
  const id = newId("contactTag");
  await db.insert(schema.contactTag).values({ id, organizationId, name });
  return id;
}

export async function deleteContactTag(organizationId: string, id: string) {
  const db = getDb();
  const deleted = await db
    .delete(schema.contactTag)
    .where(
      scoped(
        schema.contactTag.organizationId,
        organizationId,
        eq(schema.contactTag.id, id)
      )
    )
    .returning({ id: schema.contactTag.id });
  if (!deleted[0]) throw new ContactMetadataError(404, "not_found", "Etiqueta no encontrada");
}

export async function createContactCustomField(
  organizationId: string,
  input: { label: string; type: CustomFieldType; options?: string[] }
) {
  const db = getDb();
  const label = cleanName(input.label, 80);
  const key = customFieldKeyFromLabel(label);
  const options = cleanOptions(input.type, input.options);
  const existing = await db
    .select({ id: schema.contactCustomField.id })
    .from(schema.contactCustomField)
    .where(
      scoped(
        schema.contactCustomField.organizationId,
        organizationId,
        eq(schema.contactCustomField.key, key)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw new ContactMetadataError(
      409,
      "field_exists",
      "Ya existe un campo con un nombre equivalente"
    );
  }
  const maxPosition = await db
    .select({ position: schema.contactCustomField.position })
    .from(schema.contactCustomField)
    .where(scoped(schema.contactCustomField.organizationId, organizationId))
    .orderBy(asc(schema.contactCustomField.position));
  const position = (maxPosition.at(-1)?.position ?? -1) + 1;
  const id = newId("contactCustomField");
  await db.insert(schema.contactCustomField).values({
    id,
    organizationId,
    key,
    label,
    type: input.type,
    options,
    position,
  });
  return id;
}

export async function deleteContactCustomField(organizationId: string, id: string) {
  const db = getDb();
  const deleted = await db
    .delete(schema.contactCustomField)
    .where(
      scoped(
        schema.contactCustomField.organizationId,
        organizationId,
        eq(schema.contactCustomField.id, id)
      )
    )
    .returning({ id: schema.contactCustomField.id });
  if (!deleted[0]) throw new ContactMetadataError(404, "not_found", "Campo no encontrado");
}

export async function replaceContactMetadata(
  organizationId: string,
  contactId: string,
  input: { tagIds: string[]; values: Array<{ fieldId: string; value: unknown }> }
): Promise<ContactMetadataDto> {
  const contact = await getContactById(organizationId, contactId);
  if (!contact) throw new ContactMetadataError(404, "not_found", "Contacto no encontrado");

  const definitions = await listContactMetadataDefinitions(organizationId);
  const allowedTags = new Set(definitions.tags.map((tag) => tag.id));
  const allowedFields = new Map(definitions.fields.map((field) => [field.id, field]));
  const tagIds = Array.from(new Set(input.tagIds));
  if (tagIds.some((tagId) => !allowedTags.has(tagId))) {
    throw new ContactMetadataError(422, "invalid_tag", "La etiqueta no pertenece a esta organización");
  }

  const normalizedValues = new Map<string, unknown>();
  for (const item of input.values) {
    const field = allowedFields.get(item.fieldId);
    if (!field) {
      throw new ContactMetadataError(422, "invalid_field", "El campo no pertenece a esta organización");
    }
    try {
      const value = normalizeCustomFieldValue(field, item.value);
      if (value !== null) normalizedValues.set(field.id, value);
    } catch (error) {
      if (error instanceof InvalidCustomFieldValueError) {
        throw new ContactMetadataError(
          422,
          "invalid_value",
          `${field.label}: ${error.message}`
        );
      }
      throw error;
    }
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.contactTagAssignment)
      .where(
        scoped(
          schema.contactTagAssignment.organizationId,
          organizationId,
          eq(schema.contactTagAssignment.contactId, contactId)
        )
      );
    if (tagIds.length > 0) {
      await tx.insert(schema.contactTagAssignment).values(
        tagIds.map((tagId) => ({
          id: newId("contactTagAssignment"),
          organizationId,
          contactId,
          tagId,
        }))
      );
    }

    await tx
      .delete(schema.contactCustomFieldValue)
      .where(
        scoped(
          schema.contactCustomFieldValue.organizationId,
          organizationId,
          eq(schema.contactCustomFieldValue.contactId, contactId)
        )
      );
    if (normalizedValues.size > 0) {
      await tx.insert(schema.contactCustomFieldValue).values(
        Array.from(normalizedValues, ([fieldId, value]) => ({
          id: newId("contactCustomFieldValue"),
          organizationId,
          contactId,
          fieldId,
          value,
        }))
      );
    }
  });

  return (await getContactMetadata(organizationId, contactId))!;
}
