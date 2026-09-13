import { apiError, parseBody, withAuth } from "@/lib/api";
import { quoteCatalogSchema } from "@/server/quotes/config";
import {
  deleteQuoteCatalog,
  getQuoteCatalog,
  saveQuoteCatalog,
} from "@/server/quotes/settings";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) =>
  Response.json({ catalog: await getQuoteCatalog(session.organizationId) })
);

export const PUT = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede configurar precios");
  }
  const body = await parseBody(req, quoteCatalogSchema);
  if (!body.ok) return body.response;
  await saveQuoteCatalog(session.organizationId, body.data);
  return Response.json({ ok: true, catalog: body.data });
});

export const DELETE = withAuth(async (session) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede borrar el cotizador");
  }
  await deleteQuoteCatalog(session.organizationId);
  return Response.json({ ok: true });
});
