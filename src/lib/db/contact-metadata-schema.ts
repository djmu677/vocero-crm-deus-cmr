import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { contact, organization } from "./schema";

/** C02 — taxonomía y campos CRM configurables por organización. */
export const contactTag = pgTable(
  "contact_tag",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("contact_tag_org_name_uq").on(t.organizationId, t.name),
    index("contact_tag_org_name_idx").on(t.organizationId, t.name),
  ]
);

export const contactTagAssignment = pgTable(
  "contact_tag_assignment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => contactTag.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("contact_tag_assignment_org_contact_tag_uq").on(
      t.organizationId,
      t.contactId,
      t.tagId
    ),
    index("contact_tag_assignment_org_contact_idx").on(
      t.organizationId,
      t.contactId
    ),
    index("contact_tag_assignment_org_tag_idx").on(t.organizationId, t.tagId),
  ]
);

export const contactCustomField = pgTable(
  "contact_custom_field",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type", {
      enum: ["text", "number", "date", "boolean", "select"],
    }).notNull(),
    options: jsonb("options").$type<string[]>(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("contact_custom_field_org_key_uq").on(t.organizationId, t.key),
    index("contact_custom_field_org_position_idx").on(
      t.organizationId,
      t.position
    ),
  ]
);

export const contactCustomFieldValue = pgTable(
  "contact_custom_field_value",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => contactCustomField.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<unknown>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("contact_custom_field_value_org_contact_field_uq").on(
      t.organizationId,
      t.contactId,
      t.fieldId
    ),
    index("contact_custom_field_value_org_contact_idx").on(
      t.organizationId,
      t.contactId
    ),
    index("contact_custom_field_value_org_field_idx").on(
      t.organizationId,
      t.fieldId
    ),
  ]
);
