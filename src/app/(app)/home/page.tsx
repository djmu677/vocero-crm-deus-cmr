import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { getSessionOrNull } from "@/lib/auth/session";
import { agendaEnabled } from "@/server/agenda/flag";
import { getBranding } from "@/server/branding";
import { getHomeSummary } from "@/server/home/summary";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");

  const agenda = agendaEnabled();
  const [summary, branding] = await Promise.all([
    getHomeSummary(session.organizationId, { agenda }),
    getBranding(session.organizationId),
  ]);

  return (
    <HomeDashboard
      summary={summary}
      currency={branding.currency}
      agenda={agenda}
    />
  );
}
