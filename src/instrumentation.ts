/**
 * Hook de arranque de Next. El trabajo real vive en instrumentation-node.ts
 * (import dinámico condicionado al runtime para que el bundler edge no
 * intente resolver dependencias de Node como `postgres`).
 */
export async function register(): Promise<void> {
  // V07: las rutas de regresión visual funcionan con fixtures falsos y no
  // necesitan workers, base de datos ni secretos. Evita iniciar tareas de
  // producción dentro del servidor efímero de Playwright.
  if (process.env.PARLEY_VISUAL_TEST === "1") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupOrphanRuns, startBackgroundWorkers } = await import(
      "./instrumentation-node"
    );
    await cleanupOrphanRuns();
    await startBackgroundWorkers();
  }
}
