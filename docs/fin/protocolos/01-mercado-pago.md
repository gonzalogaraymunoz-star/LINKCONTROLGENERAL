# FIN · Protocolo 01 · Mercado Pago

## Objetivo
Conectar Mercado Pago como pasarela de cobro reutilizable para cualquier negocio de LINK, manteniendo trazabilidad por negocio, reserva/cotización, cliente, pago, comisión, neto, comprobante y conciliación.

## Estado de referencia · Hotel Experience
- Proveedor: `mercado_pago`
- Integración: Checkout Pro
- Ambientes: test + production
- Estado actual: `needs_credentials`
- Webhook: `unverified`
- Cargos reales: deshabilitados hasta certificación
- Secrets esperados:
  - `MERCADO_PAGO_TEST_ACCESS_TOKEN`
  - `MERCADO_PAGO_ACCESS_TOKEN`
  - `MERCADO_PAGO_WEBHOOK_SECRET`

## Contrato FIN
Cada pago debe conservar:
- business_id / business_key
- reservation_id o sales_quote_id
- payment_intent_id
- provider + environment
- preference_id / payment_id
- checkout_url
- gross_amount
- currency
- fee_details
- net_received_amount
- payment_method_id / payment_type_id
- status / status_detail
- date_approved / updated_at
- comprobante
- conciliación

## Protocolo de alta para un nuevo negocio

### 1. Registrar el negocio en FIN
Confirmar que el negocio exista en:
- LINK WORLD
- `fin_businesses`
- política financiera del negocio

No habilitar una ruta de cobro sin identificar quién es el dueño de la recaudación.

### 2. Crear cuenta de proveedor
Crear/validar cuenta Mercado Pago por:
- business_id
- environment: test / production
- provider: mercado_pago
- integration: checkout_pro
- credential_ref correspondiente

Estado inicial:
- `needs_credentials`
- webhook `unverified`
- real_charges_enabled = false

### 3. Instalar credenciales
Guardar secretos únicamente en backend/Edge Function Secrets.
Nunca en frontend, metadata visible o base pública.

Test:
- `MERCADO_PAGO_TEST_ACCESS_TOKEN`

Producción:
- `MERCADO_PAGO_ACCESS_TOKEN`

Webhook:
- `MERCADO_PAGO_WEBHOOK_SECRET`

### 4. Verificar conexión
Ejecutar la acción `verify_connection`.

La verificación debe consultar `/users/me` en Mercado Pago y registrar:
- external_merchant_id
- verified_at
- status verificado

Si falla, la ruta sigue bloqueada.

### 5. Configurar webhook
Endpoint actual:
`/functions/v1/mercado-pago?action=webhook`

Requisitos:
- firma válida
- request id
- tolerancia temporal
- consulta posterior del pago real a Mercado Pago
- idempotencia del evento

No confiar solamente en los datos recibidos en el webhook.

### 6. Crear ruta FIN
Registrar en `fin_business_payment_routes`:
- negocio
- method_type = payment_link
- provider = mercado_pago
- moneda
- prioridad
- settlement_mode
- reconciliation_mode = provider_event

La ruta permanece deshabilitada hasta terminar prueba.

### 7. Prueba TEST end-to-end
Crear una reserva o cotización de prueba.
Generar Checkout Pro desde FIN.

Validar:
1. payment_intent creado
2. preference_id guardado
3. checkout_url generado
4. pago ejecutado
5. webhook recibido
6. firma validada
7. pago consultado nuevamente a Mercado Pago
8. status registrado
9. fee_details registrados
10. net_received_amount registrado
11. settlement/conciliación creado
12. pago visible en FIN y en la ficha origen

### 8. Probar casos comerciales
Probar como mínimo:
- pago total
- abono parcial
- saldo posterior
- tarjeta
- opción de cuotas permitida

Nunca asumir comisión teórica cuando Mercado Pago entrega el costo real de la transacción.

### 9. Certificar producción
Antes de habilitar cobros reales:
- cuenta production verificada
- webhook production verificado
- política financiera verificada
- perfil tributario correspondiente listo
- ruta FIN creada
- safety latch habilitado deliberadamente
- prueba controlada exitosa

Sólo entonces:
`real_charges_enabled = true`

### 10. Operación normal
Flujo:
Reserva/Cotización
→ FIN calcula monto
→ operador ve costo/neto esperado
→ genera link
→ cliente paga
→ Mercado Pago confirma
→ FIN registra bruto/comisión/neto
→ adjunta comprobante
→ concilia
→ actualiza reserva

## Estados estándar
- No configurado
- En configuración
- Necesita credenciales
- Listo para prueba
- Webhook pendiente
- Certificado TEST
- Listo para producción
- Operativo
- Bloqueado

## Regla de seguridad
Una cuenta o ruta nunca se considera operativa porque exista código, una API key o un link generado.

**Operativa = conexión verificada + webhook verificado + transacción end-to-end + conciliación + evidencia.**

## Reutilización para próximos clientes
Para incorporar un nuevo negocio no se crea una integración nueva.
Se instancia este mismo contrato:
1. alta del negocio,
2. cuenta proveedor,
3. credenciales,
4. verificación,
5. webhook,
6. ruta FIN,
7. prueba,
8. certificación.

La lógica de Mercado Pago permanece transversal; cambia la identidad del negocio, su cuenta, políticas y reglas económicas.
