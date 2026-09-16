CREATE TABLE "contact_tag" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tag_assignment" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "tag_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_custom_field" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "type" text NOT NULL,
  "options" jsonb,
  "position" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_custom_field_value" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "contact_id" text NOT NULL,
  "field_id" text NOT NULL,
  "value" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_tag_assignment" ADD CONSTRAINT "contact_tag_assignment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_tag_assignment" ADD CONSTRAINT "contact_tag_assignment_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_tag_assignment" ADD CONSTRAINT "contact_tag_assignment_tag_id_contact_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."contact_tag"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_custom_field" ADD CONSTRAINT "contact_custom_field_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_custom_field_value" ADD CONSTRAINT "contact_custom_field_value_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_custom_field_value" ADD CONSTRAINT "contact_custom_field_value_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_custom_field_value" ADD CONSTRAINT "contact_custom_field_value_field_id_contact_custom_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."contact_custom_field"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_org_name_uq" ON "contact_tag" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX "contact_tag_org_name_idx" ON "contact_tag" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_assignment_org_contact_tag_uq" ON "contact_tag_assignment" USING btree ("organization_id","contact_id","tag_id");
--> statement-breakpoint
CREATE INDEX "contact_tag_assignment_org_contact_idx" ON "contact_tag_assignment" USING btree ("organization_id","contact_id");
--> statement-breakpoint
CREATE INDEX "contact_tag_assignment_org_tag_idx" ON "contact_tag_assignment" USING btree ("organization_id","tag_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_custom_field_org_key_uq" ON "contact_custom_field" USING btree ("organization_id","key");
--> statement-breakpoint
CREATE INDEX "contact_custom_field_org_position_idx" ON "contact_custom_field" USING btree ("organization_id","position");
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_custom_field_value_org_contact_field_uq" ON "contact_custom_field_value" USING btree ("organization_id","contact_id","field_id");
--> statement-breakpoint
CREATE INDEX "contact_custom_field_value_org_contact_idx" ON "contact_custom_field_value" USING btree ("organization_id","contact_id");
--> statement-breakpoint
CREATE INDEX "contact_custom_field_value_org_field_idx" ON "contact_custom_field_value" USING btree ("organization_id","field_id");
