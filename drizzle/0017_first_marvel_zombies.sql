CREATE TABLE "telegram_alert_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"bot_token_cipher" text NOT NULL,
	"bot_token_iv" text NOT NULL,
	"bot_token_tag" text NOT NULL,
	"chat_id" text NOT NULL,
	"bot_username" text,
	"chat_label" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_alert_settings" ADD CONSTRAINT "telegram_alert_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_alert_settings_org_uq" ON "telegram_alert_settings" USING btree ("organization_id");