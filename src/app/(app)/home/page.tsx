import Link from "next/link";
import { ArrowRight, Inbox, Kanban, Sparkles, Workflow } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES = [
  {
    href: "/inbox",
    label: "Bandeja",
    description: "Atiende las conversaciones activas y revisa mensajes pendientes.",
    icon: Inbox,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    description: "Sigue el avance comercial de cada oportunidad.",
    icon: Kanban,
  },
  {
    href: "/agent",
    label: "Agente",
    description: "Administra el comportamiento y conocimiento de la IA.",
    icon: Sparkles,
  },
  {
    href: "/automation",
    label: "Automatización",
    description: "Configura reglas comerciales, cotización y alertas.",
    icon: Workflow,
  },
] as const;

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b px-4 py-4 sm:px-6">
        <p className="kicker">Espacio de trabajo</p>
        <h1 className="page-title mt-1">Inicio</h1>
        <p className="body-copy mt-1 max-w-content-narrow">
          Accede rápidamente a las áreas principales de Parley.
        </p>
      </header>

      <main className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        {MODULES.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Card className="h-full transition-[border-color,transform,box-shadow] group-hover:-translate-y-0.5 group-hover:border-brand-soft group-hover:shadow-md">
              <CardHeader>
                <module.icon
                  aria-hidden="true"
                  className="mb-2 h-5 w-5 text-brand"
                  strokeWidth={1.8}
                />
                <CardTitle className="flex items-center justify-between gap-3">
                  {module.label}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-text-3 transition-transform group-hover:translate-x-0.5"
                  />
                </CardTitle>
                <CardDescription className="leading-5">
                  {module.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
}
