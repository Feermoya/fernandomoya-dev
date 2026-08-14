-- Seed DEMO (borrar con panel_cobros_demo_delete.sql)
-- Marcador: clients.notes = '[seed-demo]'

insert into public.clients (id, name, active, start_date, notes) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Avellaneda Automotores',
    true,
    '2026-01-01',
    '[seed-demo]'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Poletino',
    true,
    '2026-01-01',
    '[seed-demo]'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Sanación en Movimiento',
    true,
    '2026-01-01',
    '[seed-demo]'
  )
on conflict (id) do nothing;

insert into public.services (
  id, client_id, name, active, billing_type,
  reference_amount, reference_currency, billing_mode, due_day,
  start_date, notes
) values
  -- Avellaneda Web ARS recurring current_month
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Web',
    true,
    'recurring',
    100000.00,
    'ARS',
    'current_month',
    10,
    '2026-01-01',
    '[seed-demo]'
  ),
  -- Poletino Web USD recurring previous_month
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Web',
    true,
    'recurring',
    45.00,
    'USD',
    'previous_month',
    10,
    '2026-01-01',
    '[seed-demo]'
  ),
  -- Poletino stickers one_time
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Stickers',
    true,
    'one_time',
    80.00,
    'USD',
    null,
    null,
    '2026-08-01',
    '[seed-demo]'
  ),
  -- Sanación Web USD recurring due_day 24
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Web',
    true,
    'recurring',
    50.00,
    'USD',
    'current_month',
    24,
    '2026-01-01',
    '[seed-demo]'
  )
on conflict (id) do nothing;

-- Charges agosto 2026 (recurring) + un one_time
insert into public.charges (
  id, service_id, period, reference_amount, reference_currency, due_date
) values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '2026-08-01',
    100000.00,
    'ARS',
    '2026-08-10'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    '2026-08-01',
    45.00,
    'USD',
    '2026-09-10'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
    '2026-08-01',
    50.00,
    'USD',
    '2026-08-24'
  ),
  -- Stickers one_time: period null
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    null,
    80.00,
    'USD',
    '2026-08-15'
  )
on conflict (id) do nothing;

-- Payment ejemplo: Poletino Web USD cobrado en ARS con MEP 1520
insert into public.payments (
  id, charge_id, paid_at,
  amount_received, currency_received, exchange_rate,
  reference_amount, reference_currency,
  payment_method, notes
) values
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '2026-09-08',
    68400.00,
    'ARS',
    1520.000000,
    45.00,
    'USD',
    'Transferencia',
    '[seed-demo]'
  )
on conflict (id) do nothing;
