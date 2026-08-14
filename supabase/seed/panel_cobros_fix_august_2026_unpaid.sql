-- =============================================================================
-- CORRECTIVO SEGURO — Agosto 2026: payments seed incorrectos (sin verde)
-- =============================================================================
-- Contexto:
--   La planilla: importe = lo que corresponde cobrar.
--   Fondo VERDE = efectivamente pagó.
--   Importe sin verde = NO pagó (charge pendiente / vencido).
--
-- El seed histórico importó TODOS los importes de agosto como payments.
-- En agosto, Avellaneda y HEMA tenían importe SIN verde → NO debían tener payment.
--
-- Este script:
--   ✅ Elimina SOLO 2 payments del seed `[seed-history-2026]` de agosto 2026:
--        · Avellaneda Automotores  ARS 100000  (service …2202)
--        · HEMA                    ARS 60640   (service …2207)
--   ❌ NO borra charges (quedan overdue)
--   ❌ NO toca los otros 5 payments correctos de agosto (verde)
--   ❌ NO toca payments manuales (sin el marcador seed)
--   ❌ NO corrige otros meses (pendiente revisión verde)
--
-- Esperado después:
--   Cobrado agosto ARS = 315610
--     = 30000 + 90900 + 58000 + 60830 + 75880
--   Vencidos = 2 (Avellaneda + HEMA)
--
-- Ejecutar MANUALMENTE en Supabase SQL Editor.
-- NO lo corre el agente / CI.
-- Idempotente: re-ejecutar no falla si ya se borraron.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Preview: qué se va a borrar (debe devolver exactamente 2 filas)
-- ---------------------------------------------------------------------------
-- select
--   p.id,
--   p.paid_at,
--   p.amount_received,
--   p.notes,
--   c.service_id,
--   c.period,
--   c.due_date
-- from public.payments p
-- join public.charges c on c.id = p.charge_id
-- where p.notes like '%[seed-history-2026]%'
--   and p.paid_at >= '2026-08-01'
--   and p.paid_at <  '2026-09-01'
--   and c.service_id in (
--     '22222222-2222-4222-8222-222222222202'::uuid, -- avellaneda
--     '22222222-2222-4222-8222-222222222207'::uuid  -- hema
--   )
-- order by c.service_id;

-- ---------------------------------------------------------------------------
-- 1) DELETE payments incorrectos (solo seed + agosto + esos 2 servicios)
-- ---------------------------------------------------------------------------
delete from public.payments p
using public.charges c
where p.charge_id = c.id
  and p.notes like '%[seed-history-2026]%'
  and p.paid_at >= '2026-08-01'
  and p.paid_at <  '2026-09-01'
  and c.service_id in (
    '22222222-2222-4222-8222-222222222202'::uuid, -- Avellaneda Automotores
    '22222222-2222-4222-8222-222222222207'::uuid  -- HEMA
  );

-- ---------------------------------------------------------------------------
-- 2) Verificación: charges de agosto siguen existiendo (NO se borran)
-- ---------------------------------------------------------------------------
-- Esperado: 2 filas (avellaneda period 2026-07-01, hema period 2026-07-01)
-- select c.id, c.service_id, c.period, c.due_date, c.reference_amount,
--        (select count(*) from public.payments p where p.charge_id = c.id) as payment_count
-- from public.charges c
-- where c.service_id in (
--   '22222222-2222-4222-8222-222222222202'::uuid,
--   '22222222-2222-4222-8222-222222222207'::uuid
-- )
--   and c.due_date >= '2026-08-01'
--   and c.due_date <  '2026-09-01';
-- payment_count debe ser 0 en ambos.

-- ---------------------------------------------------------------------------
-- 3) Verificación: cobrado agosto seed = 315610
-- ---------------------------------------------------------------------------
-- select coalesce(sum(p.amount_received), 0) as agosto_cobrado_seed
-- from public.payments p
-- where p.currency_received = 'ARS'
--   and p.notes like '%[seed-history-2026]%'
--   and p.paid_at >= '2026-08-01'
--   and p.paid_at <  '2026-09-01';
-- Esperado: 315610

-- ---------------------------------------------------------------------------
-- 4) Verificación: los 5 pagos correctos de agosto siguen
-- ---------------------------------------------------------------------------
-- select
--   case
--     when p.notes like '%client=pato%' then 'pato'
--     when p.notes like '%client=poletino%' then 'poletino'
--     when p.notes like '%client=sanacion%' then 'sanacion'
--     when p.notes like '%client=giacomelli%' then 'giacomelli'
--     when p.notes like '%client=giuliana%' then 'giuliana'
--     else 'otro'
--   end as cliente,
--   p.amount_received
-- from public.payments p
-- where p.notes like '%[seed-history-2026]%'
--   and p.paid_at >= '2026-08-01'
--   and p.paid_at <  '2026-09-01'
-- order by cliente;
-- Esperado (5 filas):
--   giacomelli 60830
--   giuliana   75880
--   pato       30000
--   poletino   90900
--   sanacion   58000

commit;
