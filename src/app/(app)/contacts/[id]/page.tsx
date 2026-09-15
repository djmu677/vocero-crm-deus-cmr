import { Customer360Client } from "@/components/contacts/customer-360-client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function Customer360Page({ params }: Params) {
  const { id } = await params;
  return <Customer360Client contactId={id} />;
}
