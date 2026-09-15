import { apiError, withAuth } from "@/lib/api";
import { getCustomer360 } from "@/server/contacts/customer-360";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const customer = await getCustomer360(session.organizationId, id);
  if (!customer) return apiError(404, "not_found", "Contacto no encontrado");
  return Response.json({ customer });
});
