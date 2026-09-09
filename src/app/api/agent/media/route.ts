import { desc, eq } from "drizzle-orm";
import { apiError, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { serializeAgentMedia } from "@/server/bot/media-library";
import {
  MediaValidationError,
  saveMediaFile,
  validateOutgoing,
} from "@/server/whatsapp/media";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const assets = await db
    .select()
    .from(schema.mediaAsset)
    .where(
      scoped(
        schema.mediaAsset.organizationId,
        session.organizationId,
        eq(schema.mediaAsset.agentLibrary, true)
      )
    )
    .orderBy(desc(schema.mediaAsset.createdAt));
  return Response.json({ assets: assets.map(serializeAgentMedia) });
});

export const POST = withAuth(async (session, req: Request) => {
  const form = await req.formData().catch(() => null);
  if (!form) return apiError(400, "invalid", "Se esperaba multipart/form-data");

  const file = form.get("file");
  const label = String(form.get("label") ?? "").trim();
  const usage = String(form.get("usage") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  if (!(file instanceof File)) {
    return apiError(422, "invalid", "Selecciona una imagen o un video");
  }
  if (!label || label.length > 120) {
    return apiError(422, "invalid", "El nombre debe tener entre 1 y 120 caracteres");
  }
  if (!usage || usage.length > 2000) {
    return apiError(422, "invalid", "Explica cuándo debe enviar este recurso");
  }
  if (caption.length > 1024) {
    return apiError(422, "invalid", "El pie no puede superar 1.024 caracteres");
  }

  const data = Buffer.from(await file.arrayBuffer());
  let kind: ReturnType<typeof validateOutgoing>;
  try {
    kind = validateOutgoing(file.type || "application/octet-stream", data.byteLength);
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return apiError(error.code === "too_large" ? 413 : 415, error.code, error.message);
    }
    throw error;
  }
  if (kind !== "image" && kind !== "video") {
    return apiError(415, "unsupported_type", "La biblioteca admite imágenes y videos");
  }

  const id = newId("mediaAsset");
  const storagePath = await saveMediaFile(session.organizationId, id, data);
  const db = getDb();
  const inserted = await db
    .insert(schema.mediaAsset)
    .values({
      id,
      organizationId: session.organizationId,
      kind,
      mimeType: file.type,
      fileName: file.name || null,
      fileSize: data.byteLength,
      caption: caption || null,
      storagePath,
      fetchStatus: "available",
      agentLibrary: true,
      agentActive: true,
      agentLabel: label,
      agentUsage: usage,
    })
    .returning();

  return Response.json(
    { asset: serializeAgentMedia(inserted[0]!) },
    { status: 201 }
  );
});
