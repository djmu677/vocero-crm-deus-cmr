import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { CUSTOM_FIELD_TYPES } from "@/lib/contact-metadata";
import {
  ContactMetadataError,
  createContactCustomField,
  createContactTag,
  deleteContactCustomField,
  deleteContactTag,
  listContactMetadataDefinitions,
} from "@/server/contacts/contact-metadata";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_tag"), name: z.string() }),
  z.object({ action: z.literal("delete_tag"), id: z.string().min(1) }),
  z.object({
    action: z.literal("create_field"),
    label: z.string(),
    type: z.enum(CUSTOM_FIELD_TYPES),
    options: z.array(z.string()).max(50).optional(),
  }),
  z.object({ action: z.literal("delete_field"), id: z.string().min(1) }),
]);

function metadataError(error: unknown) {
  return error instanceof ContactMetadataError
    ? apiError(error.status, error.code, error.message)
    : null;
}

export const GET = withAuth(async (session) => {
  return Response.json({
    definitions: await listContactMetadataDefinitions(session.organizationId),
  });
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, actionSchema);
  if (!body.ok) return body.response;
  try {
    switch (body.data.action) {
      case "create_tag":
        await createContactTag(session.organizationId, body.data.name);
        break;
      case "delete_tag":
        await deleteContactTag(session.organizationId, body.data.id);
        break;
      case "create_field":
        await createContactCustomField(session.organizationId, body.data);
        break;
      case "delete_field":
        await deleteContactCustomField(session.organizationId, body.data.id);
        break;
    }
    return Response.json({
      definitions: await listContactMetadataDefinitions(session.organizationId),
    });
  } catch (error) {
    return metadataError(error) ?? apiError(500, "internal", "No se pudo actualizar la configuración");
  }
});
