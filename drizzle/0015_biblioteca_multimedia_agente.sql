ALTER TABLE "media_asset" ADD COLUMN "agent_library" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "agent_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "agent_label" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "agent_usage" text;