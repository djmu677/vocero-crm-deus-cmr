# P03 — Validador determinista del pipeline

## Alcance

Parley valida en servidor cada avance solicitado por NEA antes de escribir la
etapa del lead. El texto libre de la regla orienta al agente, pero nunca basta
por sí solo para autorizar un movimiento.

## Contrato HTTP

`POST /api/bot/stage`

```json
{
  "conversationId": "cv_123",
  "stage": "Interesado",
  "evidence": ["product_identified", "explicit_interest"]
}
```

`evidence` utiliza exclusivamente el vocabulario cerrado de P02. Si un cliente
anterior no envía el campo, Parley lo interpreta como una lista vacía y
responde con un rechazo comercial explicable, no con un error de formato.

## Precedencia de validación

1. La conversación, el lead y las etapas se resuelven dentro de la organización
   de la instancia.
2. El destino debe existir y ser una etapa abierta.
3. La automatización del destino debe estar activa.
4. El movimiento no puede retroceder.
5. El destino debe ser exactamente la siguiente columna; no se permiten saltos.
6. La etapa debe tener un contrato estructurado conocido.
7. Deben cumplirse `allOf` y `anyOf` del contrato de P02.
8. La escritura exige que el origen no haya cambiado desde la validación.

Los rechazos usan códigos estables: `protected_stage`,
`stage_automation_disabled`, `backward_stage`, `stage_skip`,
`stage_rule_missing`, `insufficient_evidence` y `stage_changed`.

Cuando falta evidencia, la respuesta incluye `missingEvidence` y
`blockerCodes`, para que P04 pueda indicarle a NEA qué dato debe recopilar.

## Despliegue escalonado

P03 no debe desplegarse por separado mientras NEA todavía use el contrato
anterior: sus intentos de avance llegarían sin `evidence` y serían rechazados de
forma segura. P04 debe adaptar NEA y ambos cambios deben desplegarse en una
ventana coordinada, Parley primero y NEA inmediatamente después.

No hay migraciones ni cambios de datos. El rollback consiste en volver al
commit anterior de Parley; los movimientos ya registrados permanecen intactos.
