import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_BRANDING } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default function VisualLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.PARLEY_VISUAL_TEST !== "1") notFound();

  return (
    <AppShell
      branding={DEFAULT_BRANDING}
      userName="Vendedora Demo"
      role="owner"
      theme="light"
      commit="visual"
      agenda
    >
      {children}
    </AppShell>
  );
}
