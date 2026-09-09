import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

type MediaAsset = typeof schema.mediaAsset.$inferSelect;

export function serializeAgentMedia(asset: MediaAsset) {
  return {
    id: asset.id,
    kind: asset.kind,
    label: asset.agentLabel ?? asset.fileName ?? "Recurso",
    usage: asset.agentUsage ?? null,
    caption: asset.caption ?? null,
    mimeType: asset.mimeType ?? null,
    fileName: asset.fileName ?? null,
    fileSize: asset.fileSize ?? null,
    active: asset.agentActive,
  };
}

export async function listAgentMedia(
  organizationId: string,
  options: { activeOnly?: boolean } = {}
) {
  const db = getDb();
  return db
    .select()
    .from(schema.mediaAsset)
    .where(
      scoped(
        schema.mediaAsset.organizationId,
        organizationId,
        and(
          eq(schema.mediaAsset.agentLibrary, true),
          ...(options.activeOnly
            ? [eq(schema.mediaAsset.agentActive, true)]
            : [])
        )
      )
    )
    .orderBy(desc(schema.mediaAsset.createdAt));
}
