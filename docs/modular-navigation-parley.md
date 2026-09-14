# V03 — Navegación modular de Parley

## Objetivo

La navegación principal queda organizada para crecer sin convertir la barra
lateral en una lista desordenada. Esta tarea cambia arquitectura de información
y rutas visibles; no cambia reglas comerciales, permisos, datos ni contratos de
API.

## Estructura definitiva

| Grupo | Módulos, en orden |
|---|---|
| Principal | Inicio, Bandeja, Pipeline, Contactos, Agenda |
| Inteligencia | Sesiones, Resultados, Agente, Multimedia, Automatización |
| Administración | Canales, Equipo, Configuración |

Multimedia se conserva como módulo principal porque retirarlo volvería a ocultar
una función que ya se separó de Automatización.

## Rutas

| Módulo | Ruta | Estado en V03 |
|---|---|---|
| Inicio | `/home` | Entrada modular básica; V04 desarrollará su tablero. |
| Bandeja | `/inbox` | Función existente, sin cambios. |
| Pipeline | `/pipeline` | Función existente, sin cambios. |
| Contactos | `/contacts` | Función existente, sin cambios. |
| Agenda | `/bookings` | Visible solo cuando la bandera Agenda está activa. |
| Sesiones | `/sessions` | Espacio estable preparado; la función se desarrollará por separado. |
| Resultados | `/results` | Presenta el Laboratorio existente con un nombre más claro. |
| Agente | `/agent` | Función existente, sin cambios. |
| Multimedia | `/media` | Función existente, sin cambios. |
| Automatización | `/automation` | Función existente, sin cambios. |
| Canales | `/channels` | Centro de accesos para canales habilitados y plantillas. |
| Equipo | `/settings/team` | Acceso directo a la gestión existente. |
| Configuración | `/settings/branding` | Entrada a marca y configuración general. |

## Compatibilidad

- `/` redirige a `/home`.
- `/lab` redirige a `/results`, por lo que marcadores antiguos continúan
  funcionando.
- Las rutas internas y APIs existentes se conservan.
- WhatsApp permanece siempre disponible.
- Instagram y Messenger se muestran según las banderas de la instancia.
- Agenda continúa decidiéndose en servidor.
- Todas las páginas nuevas viven dentro del layout autenticado, por lo que
  conservan sesión y aislamiento por organización.

## Estado activo

Canales permanece seleccionado dentro de WhatsApp, Messenger y Plantillas.
Equipo tiene selección propia. Configuración agrupa Marca, Agenda y Anuncios.
Esto evita que dos entradas principales parezcan activas a la vez.

## Accesibilidad y adaptación

- La navegación posee nombre accesible y cada módulo activo usa
  `aria-current="page"`.
- Los iconos decorativos están ocultos para lectores de pantalla.
- Los grupos tienen encabezados asociados.
- La lista central puede desplazarse sin mover la cuenta, el tema o la versión.
- El cajón móvil conserva cierre por botón, velo, navegación y tecla Escape.

## Límites de V03

V03 no implementa métricas de Inicio ni el historial funcional de Sesiones.
Tampoco rediseña el contenido de cada módulo. Esas mejoras deben apoyarse en
esta estructura sin volver a modificar las rutas principales.
