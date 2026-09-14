# V01 — Inventario visual y nombre Parley

Estado del inventario: **completo sobre `main` en `f6e5971`**.

Este documento es el mapa de entrada para V02. No propone eliminar funciones ni
cambiar contratos de servidor. Separa lo que ya funciona, lo que debe
unificarse y lo que todavía conserva el nombre anterior.

## Decisión de marca

- El nombre visible por defecto del producto será **Parley**.
- La personalización por organización se conserva: un cliente puede reemplazar
  el nombre, el color de acento y el favicon.
- V02 debe cambiar textos, marca predeterminada, wordmark, favicon generado y
  ejemplos visibles sin romper el white-label.
- Los identificadores técnicos históricos no se renombran durante el rediseño.
  Cambiarlos junto con la interfaz arriesgaría sesiones, preferencias, métricas
  o integraciones sin aportar una mejora visual.

### Referencias visibles que V02 debe convertir a Parley

| Archivo | Referencia actual | Acción |
|---|---|---|
| `src/lib/branding.ts` | `DEFAULT_BRANDING.name = "Vocero"` y preset `Azul Vocero` | Usar Parley como marca inicial y renombrar el preset sin perder sus valores hasta aprobar la paleta V02. |
| `src/components/brand-mark.tsx` | Wordmark, marca especial e inicial vinculados a Vocero | Crear identidad Parley y mantener la inicial genérica para marcas de clientes. |
| `src/lib/brand.ts` | `isVoceroName` y geometría de la marca V | Sustituir la condición visual por Parley; no mezclarlo con identificadores internos. |
| `src/lib/favicon.ts` | Favicon especial Vocero y respaldo con V | Crear favicon Parley; conservar el generador white-label. |
| `src/components/settings/branding-client.tsx` | Placeholder `Vocero` | Cambiar el ejemplo a Parley. |
| `src/components/inbox/contact-panel.tsx` | “El agente de Vocero…” | Usar el nombre configurado o una frase neutral. |
| `src/components/settings/messenger-client.tsx` | Dos ayudas que nombran Vocero | Usar Parley o “el CRM”, según el contexto. |
| `src/app/(auth)/layout.tsx` | Hero exclusivo para la marca Vocero | Diseñar el hero Parley conservando la variante white-label. |
| `README.md` | Nombre, enlaces, capturas y clonación de Vocero | Actualizar en una tarea documental coordinada con V02. |
| `package.json` | Nombre y descripción del paquete | Renombrar solo si se confirma que despliegue y caché no dependen del nombre. |

### Identificadores históricos que V02 debe conservar

| Identificador | Motivo |
|---|---|
| Cookie `vocero-theme` | Renombrarla cerraría la preferencia de tema existente en cada dispositivo. |
| Local storage `vocero.panelOpen` | Renombrarlo perdería la preferencia del panel de la Bandeja. |
| Globales `__vocero*` | Son claves internas del proceso; no aparecen al usuario. |
| `partner_agent = "vocero-crm"` | Identifica la integración existente ante Meta y sus métricas. |
| Prefijos técnicos y comentarios de migraciones | No son identidad visible y cambiarlos amplía el riesgo sin beneficio visual. |
| Rutas `/api/*`, nombres de tablas y variables de entorno | Son contratos compatibles entre Parley, NEA y despliegues existentes. |

## Mapa de pantallas

El cascarón autenticado se reparte entre `src/components/app-shell.tsx` y
`src/components/app-nav.tsx`. Debe conservar la barra lateral de escritorio,
el cajón móvil, la marca configurada, el usuario, el tema y la versión visible.

### Navegación principal

| Ruta | Componente propietario | Patrón actual | Conservar | Deuda para V02 |
|---|---|---|---|---|
| `/inbox` | `src/components/inbox/inbox-client.tsx` | Maestro–detalle adaptable, hasta tres paneles | SSE, filtros, estados, multimedia, compositor y panel del contacto | Definir cabecera propia de Bandeja dentro del sistema común; unificar campos, botones compactos, avisos y cajones. |
| `/pipeline` | `src/components/pipeline/pipeline-client.tsx` | Kanban horizontal con tarjetas y drawer | Drag and drop, monto, prioridad, etapas y reglas comerciales | Usar cabecera, tarjeta, diálogo y estado vacío comunes; mantener scroll horizontal contenido. |
| `/bookings` | `src/app/(app)/bookings/page.tsx` | Módulo opcional con lista | Bandera de Agenda y todas las acciones | Sustituir cabecera repetida y normalizar densidad con Ajustes → Agenda. |
| `/contacts` | `src/components/contacts/contacts-client.tsx` | Lista con filtros y varios diálogos | Búsqueda, archivo, edición y conversación inicial | Unificar cabecera, filtros, filas, diálogos y feedback. |
| `/agent` | `src/components/agent/agent-client.tsx` | Formulario largo de 681 líneas | Perfil, conocimiento, reglas y automatización comercial | Dividir por secciones y reutilizar `Switch`, `Section`, `Alert` y estados de carga. |
| `/media` | `src/components/media/media-library-client.tsx` | Biblioteca en página independiente | Carga, activación, edición y borrado seguro | Aplicar cabecera/estado vacío/carga comunes; no devolverla a Automatización. |
| `/automation` | `src/components/automation/automation-client.tsx` | Reglas del pipeline, cotizador y Telegram | Los tres módulos y sus validaciones | Crear navegación o secciones claras; reemplazar formularios monolíticos y controles nativos repetidos. |
| `/lab` | `src/components/lab/lab-client.tsx` | Historial y reporte de evaluaciones | Sandbox, resultados, sugerencias y protección contra envíos reales | Unificar cabecera, métricas, acordeones, avisos y vacíos sin ocultar el carácter de laboratorio. |

`/bookings` solo aparece con Agenda activa. Esa condición es funcional y no
debe resolverse con CSS ni con ocultamiento del lado cliente.

### Ajustes

El cascarón común vive en `src/app/(app)/settings/layout.tsx` y la navegación en
`src/components/settings/settings-nav.tsx`.

| Ruta | Estado | Ancho actual | Observación V02 |
|---|---|---:|---|
| `/settings/whatsapp` | Permanente | `max-w-3xl` | Wizard extenso; conservar instrucciones, seguridad y prueba. |
| `/settings/messenger` | Opcional por canal | `max-w-3xl` | Comparte patrones con WhatsApp, pero implementa avisos y opciones por separado. |
| `/settings/branding` | Permanente | `max-w-2xl` | Es el centro del white-label; debe presentar la nueva marca Parley sin bloquear marcas del cliente. |
| `/settings/templates` | Permanente | `max-w-3xl` | Normalizar tarjetas, selects y estados de sincronización. |
| `/settings/team` | Permanente | `max-w-2xl` | Normalizar formulario, lista y avisos. |
| `/settings/calendar` | Opcional por Agenda | `max-w-2xl` | Alinear visualmente Agenda, Citas y conectores externos. |
| `/settings/ads` | Opcional por Atribución | `max-w-3xl` | Conservar eventos y diagnósticos; simplificar jerarquía informativa. |

Hay dos anchos (`2xl` y `3xl`) y dos separaciones verticales (`space-y-4` y
`space-y-6`) sin una regla documentada. V02 debe definir variantes por tipo de
contenido, no imponer un ancho único a todas las pantallas.

### Acceso público

| Ruta | Componente | Conservar | Deuda para V02 |
|---|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | Inicio de sesión, errores y redirección | Reemplazar identidad Vocero por Parley y validar claro/oscuro. |
| `/register` | `src/app/(auth)/register/page.tsx` | Creación inicial y cierre posterior del registro | Compartir composición de formulario con Login y mantener explicación de propietario. |

## Sistema visual que ya existe y debe conservarse

- Tokens semánticos de superficies, texto, bordes, acento y estados en
  `src/app/globals.css` y `tailwind.config.ts`.
- Tema claro y oscuro resuelto en servidor, sin destello al cargar.
- Acento configurable por organización con contraste calculado.
- Tipografías Archivo, Instrument Serif e IBM Plex Mono servidas por Next.
- Radios, sombras y colores de estado centralizados.
- Barra lateral adaptable, cajón móvil, altura `100dvh` y reducción de
  movimiento.
- Bandeja maestro–detalle para teléfono, tableta y escritorio.
- Primitivas existentes: `Button`, `Card`, `Badge`, `Input`, `Label` y
  `Textarea`.
- Identidad propia de WhatsApp, Instagram y Messenger: sus colores literales
  son una excepción deliberada, no deuda del tema.

## Repeticiones e inconsistencias verificadas

El conteo corresponde al código de `f6e5971` y queda protegido por
`tests/unit/visual-inventory.test.ts`.

| Hallazgo | Conteo | Archivos o alcance | Componente común recomendado |
|---|---:|---|---|
| Cabecera genérica repetida | 7 | Lab, Pipeline, Multimedia, Agente, Automatización, Citas y Configuración | `PageHeader` con título, descripción, acciones y variante compacta. |
| Título de página con la misma clase | 9 | Los anteriores más Bandeja y Contactos | Parte de `PageHeader`. |
| `<select>` nativo con estilos locales | 11 en 9 archivos | Bandeja, plantillas, pipeline, contactos y ajustes | `Select` accesible con tamaños comunes. |
| `<textarea>` directo fuera de la primitiva | 4 | Compositor y Cotizador | Reutilizar `Textarea` o documentar una variante especializada. |
| Overlays `fixed inset-0` | 9 en 8 archivos | Navegación, paneles, pipeline y contactos | `Dialog` para modales y `Drawer` para paneles; no combinarlos. |
| Switch visual implementado a mano | 4 en 2 archivos | Agente y panel de contacto | `Switch` con teclado, foco y estados disabled. |
| Alertas de estado construidas localmente | Varias | WhatsApp, Messenger, Equipo, Agente, Inbox y Pipeline | `Alert` con variantes success, warning, danger e info. |
| Estados de carga/vacío locales | Varias | Multimedia, Automatización, Lab, Contactos y otros | `LoadingState` y `EmptyState`. |

### Accesibilidad de diálogos

Los diálogos no siguen una sola convención. `AmountDialog`, `LeadDrawer`,
`LossReasonDialog`, `NewContactDialog` y “Escribir primero” declaran al menos
parte de `role`, `aria-label` o `aria-modal`; `StageManager` y “Editar contacto”
no completan ese contrato. Tampoco existe una primitiva común que gestione
foco inicial, bloqueo de fondo, Escape y devolución del foco. V02 debe
resolverlo sin cambiar la acción que ejecuta cada diálogo.

### Componentes demasiado concentrados

| Componente | Líneas actuales | Separación sugerida para V02 |
|---|---:|---|
| `agent-client.tsx` | 681 | Perfil, conocimiento, multimedia heredada, reglas y pruebas. |
| `pipeline-client.tsx` | 487 | Cabecera, columna, tarjeta, drag and drop y drawer. |
| `lab-client.tsx` | 481 | Lanzador, historial, resumen, caso y sugerencias. |
| `composer.tsx` | 422 | Texto, adjuntos, ubicación, contactos y acciones. |
| `agenda-client.tsx` | 408 | Horario, proveedor, conexión y prueba. |
| `inbox-client.tsx` | 403 | Estado, selección, layout adaptable y paneles. |

Separar estos archivos no autoriza reescribir su lógica. Cada extracción debe
mantener las mismas props, llamadas de API y pruebas funcionales.

## Capturas existentes

Las cinco capturas de `docs/screenshots/` son históricas, no una fuente visual
vigente. Muestran la marca Vocero y una navegación anterior, sin módulos
recientes como Multimedia y Automatización. V02 debe generar capturas nuevas de
Bandeja, Pipeline, Laboratorio, Marca y WhatsApp, y añadir Agente, Multimedia y
Automatización en escritorio y móvil.

## Orden recomendado para V02

1. Aprobar nombre, símbolo, wordmark, favicon y paleta predeterminada Parley.
2. Cambiar únicamente identidad visible y mantener el white-label.
3. Crear `PageHeader`, `Select`, `Switch`, `Alert`, `Dialog`, `Drawer`,
   `LoadingState` y `EmptyState` con pruebas de accesibilidad.
4. Migrar primero Ajustes y Automatización, porque concentran formularios y
   reducen el riesgo sobre conversaciones activas.
5. Migrar Agente, Multimedia, Contactos y Pipeline sin alterar contratos.
6. Migrar Bandeja al final: es la pantalla más crítica y adaptable.
7. Actualizar capturas y ejecutar las pruebas responsive en 390×844, 820×1180
   y 1440×900, en claro y oscuro.

## Criterios de salida de V02

- Parley es el nombre visible predeterminado en navegación, acceso, favicon,
  metadatos, ayudas y ejemplos.
- Una organización con marca propia sigue viendo exclusivamente su nombre,
  color y favicon.
- No se pierde ninguna ruta, bandera opcional, botón, filtro, acción o dato.
- No aparecen colores de tema cableados fuera de las excepciones de identidad.
- Los controles comunes tienen foco visible y operación con teclado.
- Ninguna pantalla genera scroll horizontal del documento; el Pipeline conserva
  su scroll interno.
- Las capturas y el guion responsive representan la interfaz vigente.

## Fuera del alcance de V01

V01 no cambia CSS, textos en producción, logotipos, navegación, componentes ni
datos. Tampoco modifica NEA. Su entrega es este mapa verificable para ejecutar
V02 por partes y con rollback pequeño.
