CREATE TABLE "telegram_order_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp,
	"locked_at" timestamp,
	"sent_at" timestamp,
	"telegram_message_id" text,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_order_alert" ADD CONSTRAINT "telegram_order_alert_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_order_alert" ADD CONSTRAINT "telegram_order_alert_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_order_alert" ADD CONSTRAINT "telegram_order_alert_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_order_alert_org_lead_uq" ON "telegram_order_alert" USING btree ("organization_id","lead_id");--> statement-breakpoint
CREATE INDEX "telegram_order_alert_due_idx" ON "telegram_order_alert" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "telegram_order_alert_org_created_idx" ON "telegram_order_alert" USING btree ("organization_id","created_at");