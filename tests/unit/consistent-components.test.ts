import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function source(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("V05 — estados consistentes", () => {
  it("anuncia la carga sin provocar un salto de contenido", () => {
    const html = renderToStaticMarkup(
      createElement(LoadingState, { label: "Cargando pedidos…" })
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("min-h-40");
    expect(html).toContain("Cargando pedidos…");
  });

  it("distingue un vacío normal de un error recuperable", () => {
    const empty = renderToStaticMarkup(
      createElement(EmptyState, {
        title: "Sin pedidos",
        description: "Los pedidos nuevos aparecerán aquí.",
      })
    );
    const error = renderToStaticMarkup(
      createElement(ErrorState, {
        title: "No se pudo cargar",
        description: "Revisa tu conexión.",
        onRetry: () => undefined,
      })
    );

    expect(empty).toContain("Sin pedidos");
    expect(empty).not.toContain('role="alert"');
    expect(error).toContain('role="alert"');
    expect(error).toContain("Reintentar");
  });
});

describe("V05 — superficies comunes", () => {
  it("el diálogo tiene nombre accesible y comportamiento modal", () => {
    const html = renderToStaticMarkup(
      createElement(
        Dialog,
        {
          open: true,
          onClose: () => undefined,
          title: "Confirmar pedido",
          description: "Revisa los datos.",
        },
        createElement("p", null, "Contenido")
      )
    );
    const dialogSource = source("src/components/ui/dialog.tsx");

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Confirmar pedido");
    expect(dialogSource).toContain('event.key === "Escape"');
    expect(dialogSource).toContain('event.key !== "Tab"');
    expect(dialogSource).toContain('document.body.style.overflow = "hidden"');
    expect(dialogSource).toContain("previous?.focus()");
  });

  it("la tabla conserva encabezados semánticos y contenedor desplazable", () => {
    const html = renderToStaticMarkup(
      createElement(
        TableContainer,
        null,
        createElement(
          Table,
          null,
          createElement(
            TableHeader,
            null,
            createElement("tr", null, createElement(TableHead, null, "Pedido"))
          ),
          createElement(
            TableBody,
            null,
            createElement(
              TableRow,
              null,
              createElement(TableCell, null, "PAR-123")
            )
          )
        )
      )
    );

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('scope="col"');
    expect(html).toContain("PAR-123");
  });
});

describe("V05 — migración de pantallas reales", () => {
  it("Contactos usa filtros, estados y diálogos comunes", () => {
    const contacts = source("src/components/contacts/contacts-client.tsx");
    const create = source("src/components/contacts/new-contact-dialog.tsx");
    expect(contacts).toContain("<FilterBar>");
    expect(contacts).toContain("<LoadingState");
    expect(contacts).toContain("<ErrorState");
    expect(contacts).toContain("<EmptyState");
    expect(contacts).toContain("<Dialog");
    expect(create).toContain("<Dialog");
    expect(create).toContain("<Select");
    expect(create).not.toContain("fixed inset-0");
  });

  it("Pipeline usa diálogo y drawer comunes", () => {
    for (const file of [
      "amount-dialog.tsx",
      "loss-reason-dialog.tsx",
      "stage-manager.tsx",
    ]) {
      const component = source(`src/components/pipeline/${file}`);
      expect(component, file).toContain("<Dialog");
      expect(component, file).not.toContain("fixed inset-0");
    }
    expect(source("src/components/pipeline/lead-drawer.tsx")).toContain(
      "<Drawer"
    );
  });

  it("Agenda y Multimedia muestran el fallo en lugar de fingir un vacío", () => {
    const bookings = source("src/components/bookings/bookings-client.tsx");
    const media = source("src/components/media/media-library-client.tsx");
    for (const component of [bookings, media]) {
      expect(component).toContain("<LoadingState");
      expect(component).toContain("<ErrorState");
      expect(component).toContain("onRetry=");
    }
    expect(bookings).toContain("<EmptyState");
  });

  it("Meta usa confirmación, estados y tabla comunes", () => {
    const ads = source("src/components/settings/ads-client.tsx");
    expect(ads).toContain("<ConfirmDialog");
    expect(ads).toContain("<LoadingState");
    expect(ads).toContain("<ErrorState");
    expect(ads).toContain("<EmptyState");
    expect(ads).toContain("<TableContainer>");
    expect(ads).toContain("<Select");
  });
});
