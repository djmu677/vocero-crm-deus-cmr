# V05 — Componentes y estados consistentes

Estado: **implementado en superficies representativas**. Este contrato extiende
V02 y debe usarse en cada módulo nuevo antes de crear estilos locales.

## Problema resuelto

Parley ya tenía colores, tipografía y controles comunes, pero varias pantallas
seguían construyendo por separado sus diálogos, vacíos, cargas, errores,
filtros y tablas. Esto producía diferencias visuales y, en algunos casos, un
fallo de red se mostraba como una lista legítimamente vacía.

## Primitivas comunes

| Pieza | Responsabilidad |
|---|---|
| `Dialog` | Título accesible, foco inicial, ciclo con Tab, Escape, bloqueo del fondo, cierre exterior y devolución del foco. |
| `ConfirmDialog` | Confirmación explícita con acción normal o destructiva y estado ocupado. |
| `Drawer` | El mismo contrato modal para paneles laterales. |
| `LoadingState` | Reserva espacio, anuncia la carga y respeta movimiento reducido. |
| `EmptyState` | Explica qué aparecerá y permite ofrecer la siguiente acción. |
| `ErrorState` | Distingue un fallo recuperable y ofrece reintento. |
| `FilterBar` | Agrupa búsquedas y filtros con una sola superficie y función semántica. |
| `Table*` | Encabezados, celdas, separación, hover y desplazamiento horizontal uniformes. |

Los mensajes transitorios continúan usando `Alert` con `info`, `success`,
`warning` o `danger`. Los formularios continúan usando `Label`, `Input`,
`Select`, `Textarea`, `Switch` y `Button`.

## Pantallas migradas

- **Contactos:** filtro común, carga, error recuperable, vacío inicial, vacío
  por filtros, creación, edición e inicio de conversación.
- **Pipeline:** monto y prioridad, motivo de pérdida y drawer del trato.
- **Agenda:** carga, error recuperable, vacío inicial y lista contenida.
- **Multimedia:** la caída del endpoint ya no se confunde con una biblioteca
  vacía.
- **Configuración → Anuncios:** selector, feedback, confirmación de desconexión,
  carga, error, vacío y tabla de actividad.

## Reglas para continuar la migración

1. Un endpoint fallido nunca debe convertirse en `[]` sin mostrar el error.
2. Un vacío por filtros conserva los filtros y ofrece limpiarlos.
3. Un botón ocupado conserva su texto de acción: `Guardando…`, `Enviando…` o
   `Procesando…`.
4. Una acción destructiva o que desconecta una integración exige confirmación.
5. No se crea un nuevo `fixed inset-0` para diálogos o drawers.
6. Las tablas deben usar encabezados con `scope="col"` y desplazarse dentro de
   su contenedor en pantallas estrechas.
7. Los estados usan texto e icono; nunca dependen solo del color.

## Límites de V05

- No cambia APIs, consultas, esquemas, datos ni aislamiento por organización.
- No modifica reglas del pipeline, NEA, Meta, Telegram o Agenda.
- No intenta migrar cada botón especializado de Bandeja o Pipeline: esos
  controles poseen interacciones propias y se revisarán en V06.
- La comparación visual automatizada de todas las resoluciones pertenece a
  V07.
