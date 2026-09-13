CREATE TABLE "quote_catalog_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'CLP' NOT NULL,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shipping_rates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_catalog_settings" ADD CONSTRAINT "quote_catalog_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quote_catalog_settings_org_uq" ON "quote_catalog_settings" USING btree ("organization_id");