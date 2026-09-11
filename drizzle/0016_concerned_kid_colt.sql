ALTER TABLE "pipeline_stage" ADD COLUMN "bot_stage_key" text;--> statement-breakpoint
UPDATE "pipeline_stage"
SET "bot_stage_key" = CASE
  WHEN lower(trim("name")) IN ('en conversación', 'en conversacion') THEN 'conversation'
  WHEN lower(trim("name")) = 'interesado' THEN 'interested'
  WHEN lower(trim("name")) = 'pedido' THEN 'order'
  ELSE NULL
END
WHERE "kind" = 'open' AND "bot_stage_key" IS NULL;
