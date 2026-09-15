# V04 — Inicio operativo de Parley

El Inicio deja de ser un directorio de enlaces y pasa a responder una pregunta:
**¿qué necesita atención ahora?**

## Qué muestra

- Conversaciones con mensajes sin leer o atención humana activa.
- Tratos abiertos con prioridad alta.
- Entradas verificadas a la etapa semántica Pedido durante las últimas 24 horas.
- Citas y entregas agendadas para las próximas 24 horas.
- Fallos recientes de mensajes, alertas de Telegram, conversiones de Meta y
  pruebas del agente.
- Resultado de la última prueba del agente.

Las listas presentan como máximo cinco elementos para mantener el Inicio breve,
pero los contadores conservan el total. Cada elemento enlaza al módulo donde se
puede actuar.

## Reglas de datos

- Todas las consultas reciben el `organizationId` de la sesión y aplican el
  filtro multitenant del servidor.
- Las conversaciones y citas del Laboratorio se excluyen de la operación real.
- Agenda no se consulta cuando su bandera está apagada.
- Pedido se reconoce por `botStageKey = order`, no por el nombre editable de la
  columna.
- No se crean tablas, cachés ni copias de datos para construir el resumen.
- Las ventanas se llaman explícitamente “últimas/próximas 24 horas”; no se
  presentan como día calendario porque Parley todavía no tiene una zona horaria
  general independiente de Agenda.

## Fallos incluidos

| Fuente | Condición |
|---|---|
| Mensajes | Estado `failed` durante las últimas 24 horas. |
| Telegram | Estado `failed` o `retrying` actualizado durante ese periodo. |
| Meta CAPI | Evento de conversión `failed` creado durante ese periodo. |
| Laboratorio | Corrida `failed` iniciada durante ese periodo. |

Un reintento de Telegram aparece porque todavía requiere vigilancia, aunque no
sea un fallo definitivo.

## Límites

V04 no agrega gráficos históricos, metas comerciales, comparaciones temporales
ni acciones rápidas que escriban datos. Tampoco implementa la función futura de
Sesiones. La validación visual automatizada corresponde a V07.
