import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { serializeAgentMedia } from "@/server/bot/media-library";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  usage: z.string().trim().min(1).max(2000).optional(),
  caption: z.string().trim().max(1024).nullable().optional(),
  active: z.boolean().optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const updated = await db
    .update(schema.mediaAsset)
    .set({
      ...(body.data.label !== undefined ? { agentLabel: body.data.label } : {}),
      ...(body.data.usage !== undefined ? { agentUsage: body.data.usage } : {}),
      ...(body.data.caption !== undefined
        ? { caption: body.data.caption || null }
        : {}),
      ...(body.data.active !== undefined ? { agentActive: body.data.active } : {}),
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.mediaAsset.organizationId,
        session.organizationId,
        eq(schema.mediaAsset.id, id),
        eq(schema.mediaAsset.agentLibrary, true)
      )
    )
    .returning();
  if (!updated[0]) return apiError(404, "not_found", "Recurso no encontrado");
  return Response.json({ asset: serializeAgentMedia(updated[0]) });
});
