import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// La versión sale de package.json y no de una constante aparte: duplicarla es
// tenerla desactualizada en uno de los dos lados, y justo esta no puede mentir.
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };

const visualTest = process.env.PARLEY_VISUAL_TEST === "1";

const nextConfig: NextConfig = {
  // standalone es para la imagen Docker (Linux). En Windows el trazado crea
  // symlinks que requieren permisos elevados. V07 también lo omite en su build
  // efímero porque el runner visual usa `next start`; producción sigue
  // construyéndose como standalone.
  output: process.platform === "win32" || visualTest ? undefined : "standalone",
  // V07: Next trata los directorios que empiezan con `_` como privados. El
  // runner conserva sus URLs /__visual/* y solo durante el build visual se
  // reescriben a rutas públicas internas protegidas por PARLEY_VISUAL_TEST.
  async rewrites() {
    if (!visualTest) return [];
    return [
      {
        source: "/__visual/:path*",
        destination: "/visual-test/:path*",
      },
    ];
  },
  // El paquete `postgres` usa APIs de Node que no deben empaquetarse en el bundle.
  serverExternalPackages: ["postgres"],
  // Se congelan al construir: el binario lleva dentro de qué código salió, así
  // que no puede mentir en tiempo de ejecución. `SOURCE_COMMIT` lo inyecta
  // Coolify solo; con docker compose se pasa por `--build-arg` y si falta, la
  // app enseña solo la versión.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_COMMIT: process.env.SOURCE_COMMIT ?? "",
  },
};

export default nextConfig;
