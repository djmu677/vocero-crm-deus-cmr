import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  ContactMetadataError,
  getContactMetadata,
  replaceContactMetadata,
} from "@/server/contacts/contact-metadata";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const saveSchema = z.object({
  tagIds: z.array(z.string().min(1)).max(100),
  values: z
    .array(z.object({ fieldId: z.string().min(1), value: z.unknown() }))
    .max(100),
});

export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const metadata = await getContactMetadata(session.organizationId, id);
  if (!metadata) return apiError(404, "not_found", "Contacto no encontrado");
  return Response.json({ metadata });
});

export const PUT = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, saveSchema);
  if (!body.ok) return body.response;
  try {
    const metadata = await replaceContactMetadata(
      session.organizationId,
      id,
      body.data
    );
    return Response.json({ metadata });
  } catch (error) {
    if (error instanceof ContactMetadataError) {
      return apiError(error.status, error.code, error.message);
    }
    return apiError(500, "internal", "No se pudieron guardar los datos del contacto");
  }
});
