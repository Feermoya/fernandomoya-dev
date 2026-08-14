-- Panel de cobros — seed INICIAL (real, no demo)
-- Marcador: clients.notes / services.notes contienen '[seed-initial]'
-- Seguro para ejecutar una sola vez en una base vacía del panel.
-- NO incluye charges ni payments.
--
-- MRR esperado tras este seed:
--   USD 233 = 20+45+38+40+50+40
--   ARS 100000
--   Clientes activos = 7

begin;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
insert into public.clients (id, name, active, start_date, ended_at, notes) values
  (
    '11111111-1111-4111-8111-111111111101',
    'Página Pato',
    true,
    '2026-01-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Avellaneda Automotores',
    true,
    '2026-03-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Poletino',
    true,
    '2026-04-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Sanación en Movimiento',
    true,
    '2026-03-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    'Giacomelli Seguros',
    true,
    '2026-07-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111106',
    'Dra. Giuliana Macchiavello',
    true,
    '2026-08-01',
    null,
    '[seed-initial]'
  ),
  (
    '11111111-1111-4111-8111-111111111107',
    'HEMA',
    true,
    '2026-07-01',
    null,
    '[seed-initial]'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- services (Web recurring) — todos previous_month
-- ---------------------------------------------------------------------------
insert into public.services (
  id, client_id, name, active, billing_type,
  reference_amount, reference_currency, billing_mode, due_day,
  start_date, ended_at, notes
) values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Web',
    true,
    'recurring',
    20.00,
    'USD',
    'previous_month',
    10,
    '2026-01-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'Web',
    true,
    'recurring',
    100000.00,
    'ARS',
    'previous_month',
    10,
    '2026-03-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'Web',
    true,
    'recurring',
    45.00,
    'USD',
    'previous_month',
    10,
    '2026-04-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111104',
    'Web',
    true,
    'recurring',
    38.00,
    'USD',
    'previous_month',
    24,
    '2026-03-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111105',
    'Web',
    true,
    'recurring',
    40.00,
    'USD',
    'previous_month',
    10,
    '2026-07-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111106',
    'Web',
    true,
    'recurring',
    50.00,
    'USD',
    'previous_month',
    10,
    '2026-08-01',
    null,
    '[seed-initial]'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111107',
    'Web',
    true,
    'recurring',
    40.00,
    'USD',
    'previous_month',
    10,
    '2026-07-01',
    null,
    '[seed-initial]'
  )
on conflict (id) do nothing;

commit;
