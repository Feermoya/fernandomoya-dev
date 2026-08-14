-- =============================================================================
-- Panel de cobros — import HISTÓRICO 2026 (planilla)
-- Marcador: payments.notes contienen '[seed-history-2026]'
--   (charges NO tiene columna notes — schema real de 20260814180000_panel_cobros)
--
-- Autocontenido: un solo bloque DO con VALUES (sin temporary tables / sin tablas nuevas).
-- NO ejecuta clients/services (usar panel_cobros_initial.sql antes).
-- NO incluye "Ingreso Fijo".
-- Idempotente: seguro re-ejecutar (no duplica charges/payments).
--
-- Claves de idempotencia (solo columnas reales de charges):
--   Standard:  (service_id, period)  — index charges_service_period_unique
--   Bootstrap: (service_id, period IS NULL, due_date)
--
-- ⚠ REGLA DE LA PLANILLA (fuente de verdad):
--   · Importe escrito  = cuánto corresponde cobrar (obligación / charge).
--   · Celda VERDE      = ese cliente EFECTIVAMENTE pagó → crear payment.
--   · Importe SIN verde = todavía NO pagó → crear charge, NO crear payment.
--
--   El import original trató “importe existente = pago”. Eso es INCORRECTO.
--   Agosto 2026 ya corregido aquí (Avellaneda + HEMA unpaid).
--   Otros meses: pendientes de revisión con el color verde; NO corregir en masa aún.
--   Si ya corriste el seed viejo de agosto, aplicar también:
--     panel_cobros_fix_august_2026_unpaid.sql
--
-- Estrategia reference_*:
--   Solo conocemos amount en ARS de la planilla. No inventamos MEP ni USD contractual
--   histórico. Por eso charge (+payment si paid) usan reference_amount = amount_ars
--   y reference_currency = 'ARS', exchange_rate = NULL (cumple constraint).
--
-- Estrategia period (billing_mode previous_month):
--   Cobro del mes M → period = mes M-1, due_date = due_day en mes M.
--   Si M-1 < start_date → BOOTSTRAP: period NULL.
--
-- paid_at: due_day del mes de cobro (día exacto desconocido) — solo si create_payment.
-- payment_method: Transferencia
--
-- Totales esperados (ARS cobrado = solo celdas verdes / create_payment=true):
--   2026-01..07: sin revisión verde todavía (pueden incluir falsos pagos)
--   2026-08: 315610
--     pagados: pato 30000 + poletino 90900 + sanacion 58000
--              + giacomelli 60830 + giuliana 75880
--     unpaid (charge sin payment): avellaneda 100000 + hema 60640
-- =============================================================================

begin;

do $$
declare
  r record;
  v_charge_id uuid;
begin
  for r in
    select *
    from (
      values
        -- columnas: service_id, period, due_date, amount_ars, note, create_payment
        ('22222222-2222-4222-8222-222222222201'::uuid, NULL::date, '2026-01-10'::date, 7580.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-01 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-01-01'::date, '2026-02-10'::date, 10000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-02 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-02-01'::date, '2026-03-10'::date, 15000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-03 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-03-01'::date, '2026-04-10'::date, 15000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-04 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-04-01'::date, '2026-05-10'::date, 30000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-05 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-05-01'::date, '2026-06-10'::date, 30000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-06 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-06-01'::date, '2026-07-10'::date, 30320.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-07 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222201'::uuid, '2026-07-01'::date, '2026-08-10'::date, 30000.00::numeric, '[seed-history-2026] | client=pato | paid_month=2026-08 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222202'::uuid, NULL::date, '2026-03-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | paid_month=2026-03 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222202'::uuid, '2026-03-01'::date, '2026-04-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | paid_month=2026-04 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222202'::uuid, '2026-04-01'::date, '2026-05-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | paid_month=2026-05 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222202'::uuid, '2026-05-01'::date, '2026-06-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | paid_month=2026-06 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222202'::uuid, '2026-06-01'::date, '2026-07-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | paid_month=2026-07 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        -- Agosto Avellaneda: importe SIN verde → charge sí, payment NO
        ('22222222-2222-4222-8222-222222222202'::uuid, '2026-07-01'::date, '2026-08-10'::date, 100000.00::numeric, '[seed-history-2026] | client=avellaneda | due_month=2026-08 | kind=standard | unpaid | Spreadsheet amount without green fill — charge only, no payment'::text, false),
        ('22222222-2222-4222-8222-222222222203'::uuid, NULL::date, '2026-04-10'::date, 63815.00::numeric, '[seed-history-2026] | client=poletino | paid_month=2026-04 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222203'::uuid, '2026-04-01'::date, '2026-05-10'::date, 63815.00::numeric, '[seed-history-2026] | client=poletino | paid_month=2026-05 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222203'::uuid, '2026-05-01'::date, '2026-06-10'::date, 87600.00::numeric, '[seed-history-2026] | client=poletino | paid_month=2026-06 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222203'::uuid, '2026-06-01'::date, '2026-07-10'::date, 68000.00::numeric, '[seed-history-2026] | client=poletino | paid_month=2026-07 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222203'::uuid, '2026-07-01'::date, '2026-08-10'::date, 90900.00::numeric, '[seed-history-2026] | client=poletino | paid_month=2026-08 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, NULL::date, '2026-03-24'::date, 54530.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-03 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, '2026-03-01'::date, '2026-04-24'::date, 54530.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-04 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, '2026-04-01'::date, '2026-05-24'::date, 54530.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-05 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, '2026-05-01'::date, '2026-06-24'::date, 54168.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-06 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, '2026-06-01'::date, '2026-07-24'::date, 57449.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-07 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222204'::uuid, '2026-07-01'::date, '2026-08-24'::date, 58000.00::numeric, '[seed-history-2026] | client=sanacion | paid_month=2026-08 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222205'::uuid, NULL::date, '2026-07-10'::date, 60640.00::numeric, '[seed-history-2026] | client=giacomelli | paid_month=2026-07 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222205'::uuid, '2026-07-01'::date, '2026-08-10'::date, 60830.00::numeric, '[seed-history-2026] | client=giacomelli | paid_month=2026-08 | kind=standard | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        ('22222222-2222-4222-8222-222222222206'::uuid, NULL::date, '2026-08-10'::date, 75880.00::numeric, '[seed-history-2026] | client=giuliana | paid_month=2026-08 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null | EXCEPTION Giuliana: start_date 2026-08-01 + previous_month would skip July; August payment preserved as bootstrap charge (period null)'::text, true),
        ('22222222-2222-4222-8222-222222222207'::uuid, NULL::date, '2026-07-10'::date, 60000.00::numeric, '[seed-history-2026] | client=hema | paid_month=2026-07 | kind=bootstrap | Imported from 2026 spreadsheet, exact payment day unavailable | Historical reference stored in ARS (amount received); contractual USD for that month unknown; exchange_rate null'::text, true),
        -- Agosto HEMA: importe SIN verde → charge sí, payment NO
        ('22222222-2222-4222-8222-222222222207'::uuid, '2026-07-01'::date, '2026-08-10'::date, 60640.00::numeric, '[seed-history-2026] | client=hema | due_month=2026-08 | kind=standard | unpaid | Spreadsheet amount without green fill — charge only, no payment'::text, false)
    ) as history_rows(service_id, period, due_date, amount_ars, note, create_payment)
    order by service_id, due_date, amount_ars
  loop
    v_charge_id := null;

    -- Lookup solo con columnas reales de charges (sin notes).
    if r.period is null then
      select c.id into v_charge_id
      from public.charges c
      where c.service_id = r.service_id
        and c.period is null
        and c.due_date = r.due_date
      limit 1;
    else
      select c.id into v_charge_id
      from public.charges c
      where c.service_id = r.service_id
        and c.period = r.period
      limit 1;
    end if;

    if v_charge_id is null then
      insert into public.charges (
        service_id,
        period,
        reference_amount,
        reference_currency,
        due_date
      ) values (
        r.service_id,
        r.period,
        r.amount_ars,
        'ARS',
        r.due_date
      )
      returning id into v_charge_id;
    else
      update public.charges
      set
        reference_amount = r.amount_ars,
        reference_currency = 'ARS',
        due_date = r.due_date,
        updated_at = now()
      where id = v_charge_id;
    end if;

    -- Solo celdas verdes (create_payment = true) generan payment.
    if r.create_payment and not exists (
      select 1 from public.payments p where p.charge_id = v_charge_id
    ) then
      insert into public.payments (
        charge_id,
        paid_at,
        amount_received,
        currency_received,
        exchange_rate,
        reference_amount,
        reference_currency,
        payment_method,
        notes
      ) values (
        v_charge_id,
        r.due_date,
        r.amount_ars,
        'ARS',
        null,
        r.amount_ars,
        'ARS',
        'Transferencia',
        r.note
      );
    end if;
  end loop;
end $$;

-- Verificación rápida (opcional): total agosto 2026 cobrado (seed)
-- select sum(amount_received) from public.payments
-- where currency_received = 'ARS'
--   and paid_at >= '2026-08-01' and paid_at < '2026-09-01'
--   and notes like '%[seed-history-2026]%';
-- Esperado: 315610

commit;
