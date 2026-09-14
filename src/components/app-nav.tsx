"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  History,
  House,
  Images,
  Inbox,
  Kanban,
  LogOut,
  Radio,
  Settings,
  Sparkles,
  UserCog,
  Users,
  Workflow,
  X,
} from "lucide-react";
import type { Branding } from "@/lib/branding";
import type { ThemePreference } from "@/lib/theme";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { useEvents } from "@/components/use-events";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-mark";
import { APP_VERSION, BUILD_COMMIT, versionLabel } from "@/lib/version";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Inbox;
  badge?: boolean;
  match?: string[];
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const HOME_ITEM: NavItem = { href: "/home", label: "Inicio", icon: House };
const INBOX_ITEM: NavItem = {
  href: "/inbox",
  label: "Bandeja",
  icon: Inbox,
  badge: true,
};
const PIPELINE_ITEM: NavItem = {
  href: "/pipeline",
  label: "Pipeline",
  icon: Kanban,
};
const CONTACTS_ITEM: NavItem = {
  href: "/contacts",
  label: "Contactos",
  icon: Users,
};

/** Agenda solo existe si la instancia encendió la bandera del servidor. */
const AGENDA_ITEM: NavItem = {
  href: "/bookings",
  label: "Agenda",
  icon: CalendarDays,
};

const INTELLIGENCE_ITEMS: NavItem[] = [
  { href: "/sessions", label: "Sesiones", icon: History },
  {
    href: "/results",
    label: "Resultados",
    icon: BarChart3,
    match: ["/results", "/lab"],
  },
  { href: "/agent", label: "Agente", icon: Sparkles },
  // Multimedia sigue siendo un módulo principal: retirarlo volvería a ocultar
  // una función que el operador necesita mientras configura el agente.
  { href: "/media", label: "Multimedia", icon: Images },
  { href: "/automation", label: "Automatización", icon: Workflow },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/channels",
    label: "Canales",
    icon: Radio,
    match: [
      "/channels",
      "/settings/whatsapp",
      "/settings/messenger",
      "/settings/templates",
    ],
  },
  {
    href: "/settings/team",
    label: "Equipo",
    icon: UserCog,
    match: ["/settings/team"],
  },
  {
    href: "/settings/branding",
    label: "Configuración",
    icon: Settings,
    match: [
      "/settings/branding",
      "/settings/calendar",
      "/settings/ads",
    ],
  },
];

export function navigationGroups(agenda: boolean): NavGroup[] {
  return [
    {
      id: "principal",
      label: "Principal",
      items: [
        HOME_ITEM,
        INBOX_ITEM,
        PIPELINE_ITEM,
        CONTACTS_ITEM,
        ...(agenda ? [AGENDA_ITEM] : []),
      ],
    },
    {
      id: "inteligencia",
      label: "Inteligencia",
      items: INTELLIGENCE_ITEMS,
    },
    {
      id: "administracion",
      label: "Administración",
      items: ADMIN_ITEMS,
    },
  ];
}

export function navigationItemIsActive(
  pathname: string,
  item: Pick<NavItem, "href" | "match">
): boolean {
  const candidates = item.match ?? [item.href];
  return candidates.some(
    (candidate) =>
      pathname === candidate || pathname.startsWith(`${candidate}/`)
  );
}

function navItemClass(active: boolean) {
  return cn(
    "flex min-h-9 items-center gap-[10px] rounded-sm px-2.5 py-2 text-[13.5px] font-semibold transition-colors",
    active
      ? "bg-brand-tint text-brand-text"
      : "text-text-2 hover:bg-accent hover:text-foreground"
  );
}

export function AppNav({
  branding,
  userName,
  role,
  theme,
  commit,
  agenda = false,
  open = false,
  onClose,
}: {
  branding: Branding;
  userName: string;
  role: string;
  theme: ThemePreference;
  /** Commit resuelto en el servidor. */
  commit?: string;
  /** La disponibilidad de Agenda se decide en servidor, no en el cliente. */
  agenda?: boolean;
  /** Solo aplica por debajo de `lg`: en escritorio el lateral es fijo. */
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  async function refetchUnread() {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      conversations: { unreadCount: number }[];
    };
    setUnread(data.conversations.reduce((a, c) => a + c.unreadCount, 0));
  }

  useEffect(() => {
    void refetchUnread();
  }, []);

  useEvents({
    onMessageNew: () => void refetchUnread(),
    onConversationUpdated: () => void refetchUnread(),
  });

  const sha = commit || BUILD_COMMIT;
  const groups = navigationGroups(agenda);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[17rem] shrink-0 flex-col border-r bg-subtle px-3 pb-3.5 pt-4 transition-[transform,visibility] duration-200",
        "lg:static lg:visible lg:z-auto lg:w-60 lg:translate-x-0 lg:transition-none",
        open ? "visible translate-x-0 shadow-pop" : "invisible -translate-x-full"
      )}
    >
      <div className="mb-4 flex shrink-0 items-start gap-1.5 px-2 pt-0.5">
        <button
          onClick={onClose}
          aria-label="Cerrar el menú"
          className="-ml-1 mt-0.5 rounded-md p-1.5 text-text-3 hover:bg-accent hover:text-foreground lg:hidden"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
        <div className="min-w-0">
          <BrandLogo branding={branding} />
          <span className="kicker mt-2 block">CRM · Conversaciones</span>
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
      >
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`nav-${group.id}`}>
            <p
              id={`nav-${group.id}`}
              className="kicker mb-1.5 px-2.5 text-[9.5px]"
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = navigationItemIsActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={navItemClass(active)}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        "h-[17px] w-[17px] shrink-0",
                        active ? "text-brand" : "text-text-3"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && unread > 0 && (
                      <span
                        aria-label={`${unread} mensajes sin leer`}
                        className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1.5 text-[10.5px] font-bold text-brand-fg"
                      >
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-3 shrink-0 border-t pt-3">
        <div className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 hover:bg-accent">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">
              {userName}
            </span>
            <span className="block truncate text-[11px] text-text-3">
              {role === "owner" ? "Propietario" : "Equipo"} · En línea
            </span>
          </span>
          <ThemeToggle initial={theme} />
          <button
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="rounded p-1 text-text-3 hover:text-foreground"
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <p
          className="mt-2 px-2.5 font-mono text-[10.5px] tracking-[0.06em] text-text-2"
          title={
            sha
              ? `${branding.name} ${APP_VERSION}, construido del commit ${sha}`
              : `${branding.name} ${APP_VERSION}`
          }
        >
          {versionLabel(sha)}
        </p>
      </div>
    </aside>
  );
}
