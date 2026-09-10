# P02 — Contrato de evidencia comercial del pipeline

## Propósito

Definir qué debe estar demostrado antes de permitir que NEA solicite un avance.
Este documento y `src/server/bot/stage-evidence.ts` son el contrato de P02. No
cambian todavía el comportamiento de producción; P03 implementará el validador
que lo hará cumplir y P04 alineará las decisiones de NEA.

La evidencia puede provenir del mensaje actual, del historial de la misma
conversación o de la ficha del contacto, siempre dentro de la organización
activa. Debe ser trazable a un dato concreto; el modelo no puede inventarla.

## Etapas

### En conversación

Se permite cuando el lead abandona el saludo y realiza una acción comercial
real. Basta una de estas evidencias:

- Hace una pregunta sobre un producto, servicio, precio, medida, material,
  disponibilidad, entrega o forma de compra (`commercial_question`).
- Identifica un producto o servicio concreto (`product_identified`).

No permite avanzar:

- Un saludo aislado (`greeting_only`).
- Una respuesta vacía o genérica sin contexto comercial
  (`generic_question_only`).

### Interesado

Requiere siempre un producto o servicio identificado y, además, al menos una
señal verificable de compra:

- Expresa una preferencia de variante, material, color o configuración.
- Declara interés explícito.
- Pregunta el precio.
- Pregunta por entrega o despacho.

No basta una pregunta sin producto identificable ni una afirmación vaga que no
pueda relacionarse con el contexto. Los motivos estables son
`missing_product` y `missing_buying_signal`.

### Pedido

Un pedido debe ser ejecutable sin que el equipo tenga que adivinar información.
Requiere todas estas evidencias:

- Producto o modelo identificado.
- Confirmación explícita de que desea realizar el pedido.
- Cantidad confirmada.
- Configuración completa según el producto y el tenant. En Muebles MyM puede
  incluir tela, color, brazos, patas u otras opciones aplicables.
- Comuna de entrega.
- Dirección completa.
- Nombre o identidad del receptor confirmada; el teléfono de WhatsApp puede
  utilizarse como contacto cuando esté asociado a esa persona.

Un “sí” cuenta como confirmación únicamente si responde a una pregunta directa
y vigente sobre realizar el pedido. Aunque exista esa confirmación, cualquier
dato obligatorio ausente mantiene el lead en Interesado.

Motivos de bloqueo: `missing_product`, `ambiguous_confirmation`,
`missing_quantity`, `missing_configuration`, `missing_delivery_commune`,
`missing_delivery_address` y `missing_recipient`.

## Etapas protegidas

NEA no puede declarar automáticamente un resultado ganado, perdido, entregado
o pagado. Esas transiciones requieren una acción humana o una fuente externa
verificable, por ejemplo una confirmación de pago o entrega.

## Aplicación al caso Napoleón

| Secuencia | Evidencia acumulada | Etapa esperada | Explicación |
| --- | --- | --- | --- |
| 3 · “Hola” | Ninguna | Nuevo | Es solo un saludo. |
| 5 · Pregunta por Napoleón | Pregunta comercial + producto | En conversación | Ya existe una conversación comercial real. |
| 9 · Prefiere felpa | Producto + preferencia | Interesado | Existe una señal concreta de compra. |
| 14 · Consulta despacho y expresa interés | Interés + comuna + pregunta de entrega | Interesado | Refuerza el interés, pero no completa el pedido. |
| 22 · “Sí” a proceder | Confirmación contextual | Interesado | Faltan color definitivo, cantidad confirmada, dirección y receptor. |

La etapa final esperada es **Interesado**. El caso no debe llegar a **Pedido**
hasta completar los campos faltantes.

## Precedencia

1. Una etapa protegida siempre se bloquea.
2. Una automatización desactivada por el tenant siempre se bloquea.
3. Un movimiento hacia atrás siempre se bloquea.
4. Se evalúan todas las evidencias obligatorias (`allOf`).
5. Cuando exista `anyOf`, se exige al menos una de esas señales.
6. Si falta algo, se conserva la etapa actual y se devuelve un motivo estable.
7. Solo después de validar se registra el movimiento y su evidencia.
