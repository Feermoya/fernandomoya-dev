# Etapa 02, modelo de datos

## Objetivo

Diseñar el modelo mínimo de Supabase necesario para el MVP.

Leer antes:

`docs/cobros/00-mvp.md`

`docs/cobros/01-analisis-arquitectura.md`

También revisar el estado actual del repositorio después de la etapa 01.

## 1. Principio

Mantener el modelo pequeño.

No crear tablas pensando en funciones futuras que todavía no existen.

El modelo debe cubrir clientes, obligaciones mensuales y pagos.

## 2. Entidades

Evaluar como mínimo:

### clients

Debe representar la configuración habitual de cada cliente.

Información necesaria:

- id
- name
- active
- default_amount
- currency
- billing_mode
- due_day
- start_date
- notes
- created_at
- updated_at

Moneda:

- ARS
- USD

Modalidad:

- current_month
- previous_month

### charges

Representa lo que corresponde cobrar a un cliente para un período determinado.

Evaluar campos:

- id
- client_id
- period
- amount
- currency
- due_date
- created_at
- updated_at

No guardar un estado manual si puede derivarse correctamente.

### payments

Representa dinero efectivamente recibido.

Evaluar:

- id
- charge_id
- client_id
- paid_at
- amount
- currency
- payment_method
- notes
- created_at
- updated_at

Evaluar si `client_id` dentro de payments sería redundante debido a `charge_id`.

Priorizar normalización sin volver incómodas las consultas.

## 3. Reglas importantes

Un cliente puede cambiar de precio con el tiempo.

Modificar el precio actual del cliente no debe modificar cobros históricos.

El importe correspondiente a cada período debe quedar preservado.

Un cliente puede cobrar en ARS o USD.

ARS y USD nunca deben sumarse entre sí.

Un cliente configurado como mes vencido genera una lógica diferente de fechas respecto de uno configurado como mes actual.

El historial debe conservarse aunque un cliente sea desactivado.

No eliminar físicamente clientes con historial salvo que exista una razón técnica clara.

## 4. Estados

Definir una estrategia para obtener:

- No corresponde aún
- Pendiente
- Vencido
- Pagado

Preferentemente derivarlos de:

- Período
- Fecha actual
- due_date
- Existencia de pago

Documentar exactamente la regla utilizada.

## 5. Seguridad

Preparar el modelo pensando en RLS.

Este panel será privado.

No debe existir lectura pública de clientes, cobros ni pagos.

No implementar todavía una arquitectura multiusuario compleja.

## 6. Entregables

Antes de aplicar cambios, presentar:

1. Modelo propuesto.
2. Relaciones.
3. SQL de migración.
4. Índices.
5. Constraints.
6. Políticas RLS propuestas.
7. Explicación de cálculo de estados.
8. Ejemplo con un cliente de mes actual.
9. Ejemplo con un cliente de mes vencido.

Esperar aprobación antes de ejecutar migraciones si existe alguna decisión funcional ambigua.

Una vez aprobado, aplicar la migración siguiendo las herramientas y convenciones existentes del proyecto.

No implementar UI en esta etapa.

No avanzar a la etapa 03.