ALTER TABLE "pipeline_stage" ADD COLUMN "bot_move_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN "bot_move_criteria" text;
