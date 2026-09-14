# V02 — Sistema visual definitivo de Parley

Estado: **base aprobable e implementada**. Este documento es el contrato para
V03 y V05; una pantalla nueva no debe inventar colores, tamaños o controles.

## Principios

1. **Conversación clara.** La jerarquía debe hacer evidente quién habló, qué
   cambió y cuál es la siguiente acción.
2. **Densidad útil.** Parley es una herramienta de trabajo: compacta en listas
   y cómoda en formularios, sin espacios decorativos que oculten información.
3. **Una acción principal.** Cada bloque puede tener una acción dominante; las
   demás son secundarias, discretas o destructivas.
4. **Estado visible sin depender solo del color.** Texto, icono o forma deben
   acompañar success, warning, danger e info.
5. **White-label real.** El nombre, acento y favicon del cliente reemplazan a
   Parley sin exponer la marca base.
6. **Accesibilidad medible.** No se acepta “parece legible”: texto y controles
   se validan con relaciones de contraste y foco visible.

## Identidad

El símbolo es un globo de conversación abierto con una respuesta corta. La
palabra se escribe **parley**, en minúsculas, con Archivo 800. La señal
turquesa pertenece al símbolo y no se usa como segundo color de botones.

| Token | Claro | Uso |
|---|---|---|
| Primary | `#4f46e5` | Acción principal, selección y foco |
| Primary hover | `#4338ca` | Hover de acción principal |
| Primary soft | `#c7d2fe` | Bordes y anillos suaves |
| Primary tint | `#eef2ff` | Fondos seleccionados |
| Primary text | `#3730a3` | Texto sobre tint |
| Signal | `#14b8a6` | Detalle reconocible del símbolo |
| Signal on tile | `#5eead4` | Detalle del símbolo sobre índigo |

En oscuro el respaldo del acento es `#818cf8`; los acentos personalizados se
recalculan con `resolveAccentSet`, no se copian directamente desde el tema
claro.

### White-label

- `DEFAULT_BRANDING` usa Parley e índigo.
- Una organización puede reemplazar nombre, acento, moneda y favicon.
- Si el nombre no es Parley, se muestra su inicial, nunca el símbolo Parley.
- El acento del cliente conserva las funciones `primary`, `hover`, `soft`,
  `tint`, `text` y `foreground` en ambos temas.
- Cookies, local storage, nombres de tablas, API y `partner_agent` no se
  renombran por razones de compatibilidad.

## Color semántico

Los módulos consumen nombres, no hexadecimales:

| Familia | Aplicación |
|---|---|
| `background`, `subtle`, `card` | Fondo general, fondo auxiliar y superficie |
| `foreground`, `text-2`, `text-3`, `text-4` | Texto principal, secundario, auxiliar y deshabilitado |
| `border`, `border-strong` | Separación y contorno interactivo |
| `brand`, `brand-hover`, `brand-soft`, `brand-tint`, `brand-text` | Identidad y selección |
| `success-*` | Operación completada o conexión activa |
| `warning-*` | Atención necesaria sin bloqueo definitivo |
| `danger-*` | Error, pérdida o acción destructiva |
| `info-*` | Explicación neutral y estado informativo |

Los colores literales solo se permiten para identidad oficial de canales,
avatares, etapas configurables y la señal del logotipo.

## Contraste

- Texto normal: mínimo **4.5:1**.
- Texto grande, iconos esenciales y límites de controles: mínimo **3:1**.
- Indicador de foco: mínimo **3:1** contra la superficie vecina.
- Botón primario: su tinta debe alcanzar **4.5:1** cuando contiene texto
  pequeño, aunque WCAG permita tratar ciertos controles con 3:1.
- Nunca se comunica un estado exclusivamente por rojo, amarillo o verde.
- `contrastRatio` en `src/lib/design-system.ts` es el validador común.

## Tipografía

| Rol | Fuente | Tamaño y peso |
|---|---|---|
| Marca | Archivo | 21/30 px, 800 |
| Título de página | Archivo | 17 px, 700 |
| Título de sección | Archivo | 16 px, 700 |
| Cuerpo y controles | Archivo | 14 px, 400–600 |
| Ayuda y caption | Archivo | 12 px, 400 |
| Etiqueta editorial | IBM Plex Mono | 10.5 px, 500, mayúsculas |
| Acento editorial | Instrument Serif | Uso breve; nunca para datos o controles |
| Datos técnicos y horas | IBM Plex Mono | 11–13 px |

Las clases comunes son `.page-title`, `.section-title`, `.body-copy`,
`.caption` y `.kicker`. En móvil, inputs y textareas mantienen 16 px para evitar
el zoom automático de Safari.

## Espaciado y medidas

Escala única: **4, 8, 12, 16, 24, 32 y 48 px**.

| Elemento | Medida |
|---|---:|
| Control compacto | 32 px |
| Control predeterminado | 36 px |
| Control cómodo | 40 px |
| Radio compacto | 9 px |
| Radio de control | 12 px |
| Radio de superficie | 16 px |
| Contenido estrecho | 672 px |
| Contenido amplio | 768 px |
| Gutter de página en escritorio | 24 px |

La Bandeja y el Pipeline son superficies de aplicación y no deben limitarse a
los anchos de formularios. Ajustes usa estrecho o amplio según la complejidad,
no según el componente que lo implementó primero.

## Botones

- `default`: única acción principal del bloque.
- `secondary`: acción alternativa con superficie visible.
- `outline`: acción disponible sin competir con la principal.
- `ghost`: acciones locales, iconos o navegación secundaria.
- `destructive`: borrar, perder o desconectar; nunca para “cancelar”.
- Tamaños: 32, 36 y 40 px; botón de icono 36×36 px.
- Forma de píldora, etiqueta semibold y foco de 3 px.
- Todo botón de solo icono requiere `aria-label` y tooltip cuando el significado
  no sea evidente.
- Loading conserva el ancho, desactiva dobles clics y usa una frase de acción:
  “Guardando…”, “Enviando…”, “Conectando…”.

## Formularios

- `Input`, `Select` y `Textarea` comparten fondo, borde, radio, foco y estado
  disabled.
- Todo campo tiene `Label`; placeholder no reemplaza etiqueta.
- Ayuda debajo del campo usa `.caption` y explica formato o consecuencia.
- Error aparece junto al campo y en texto; no solo cambia el borde.
- Campos monetarios muestran moneda y formato, pero guardan centavos según el
  contrato existente.
- Checkbox es para selección independiente; `Switch` es para activar un estado
  inmediato. No son intercambiables.

## Estados y feedback

`Alert` ofrece `info`, `success`, `warning` y `danger`. Cada uso debe incluir
una frase accionable. Los estados futuros `LoadingState` y `EmptyState` se
implementarán y migrarán en V05 con estas reglas:

- Loading: reserva el espacio cuando sea posible; no hace saltar la pantalla.
- Vacío inicial: explica qué aparecerá y ofrece una acción cuando exista.
- Sin resultados: conserva filtros y ofrece limpiarlos.
- Error recuperable: explica qué falló y permite reintentar.
- Error permanente: indica qué configuración debe corregirse.
- Éxito: confirma el resultado concreto, no solo “Listo”.

## Iconografía

- Biblioteca única: Lucide.
- Tamaños: 16 px compacto, 18 px normal y 20 px destacado.
- Trazo: `1.8` por defecto.
- Los iconos heredan color semántico; no llevan hex propio salvo identidad de
  canal o marca.
- Un mismo concepto conserva el mismo icono en navegación, botón y estado.
- No usar iconos decorativos junto a cada título; deben comunicar acción,
  canal, estado o jerarquía.

## Superficies, diálogos y movimiento

- `Card`: superficie con borde fuerte, radio de 16 px y sombra pequeña.
- Elevación mediana solo para hover o superficie flotante.
- `shadow-pop` se reserva para diálogo, drawer y menú elevado.
- V05 creará `Dialog` y `Drawer` comunes con foco inicial, Escape, bloqueo del
  fondo y devolución del foco.
- Duración normal: 200 ms. Solo se animan color, borde, opacidad, sombra y
  transformaciones pequeñas.
- `prefers-reduced-motion` reduce todas las transiciones.

## Responsividad

- Teléfono de referencia: 390×844.
- Tableta: 820×1180.
- Escritorio: 1440×900.
- El documento no genera scroll horizontal.
- El Pipeline conserva scroll horizontal dentro del tablero.
- La Bandeja conserva maestro–detalle y el compositor visible con `100dvh`.
- La navegación lateral se convierte en drawer por debajo de `lg`.
- Foco, contraste y tamaño táctil se validan en claro y oscuro.

## Frontera con las siguientes tareas

- **V03** aplicará esta identidad a la nueva navegación por módulos.
- **V05** migrará cabeceras, selects, switches, alertas, diálogos y estados de
  las pantallas existentes.
- V02 no reorganiza menús, no cambia APIs y no reescribe lógica comercial.

## Lista de comprobación para código nuevo

- [ ] Usa tokens semánticos y la escala de espacio.
- [ ] Reutiliza primitivas de `src/components/ui`.
- [ ] Mantiene una sola acción principal por bloque.
- [ ] Incluye labels, foco y operación con teclado.
- [ ] Cumple contraste mínimo en claro y oscuro.
- [ ] No muestra Parley cuando la organización tiene otra marca.
- [ ] No modifica contratos de NEA, Meta, Telegram ni la base de datos.
- [ ] Pasa pruebas, tipos, lint, build y revisión responsive.
