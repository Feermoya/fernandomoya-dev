-- Panel de cobros — modelo definitivo (clients / services / charges / payments)
-- Proyecto Supabase compartido con Foco; NO tocar finance_game_state.
--
-- period (charges): date normalizado al día 1 del mes del servicio (recurring).
--   Nullable para one_time (no es una mensualidad).
--
-- Seguridad: RLS ON + sin policies para anon/authenticated.
-- Acceso solo vía service_role desde SSR (PIN + cookie del panel).
--
-- ESTA es la migración a ejecutar (aún no corrida en remoto).

create extension if not exists pgcrypto;

create or replace function public.panel_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clients (solo identidad / ciclo de vida; sin tarifas)
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  start_date date not null,
  ended_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_ended_after_start check (ended_at is null or ended_at >= start_date)
);

create index if not exists clients_active_idx on public.clients (active);
create index if not exists clients_name_idx on public.clients (name);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.panel_set_updated_at();

-- ---------------------------------------------------------------------------
-- services (tarifas y modalidad viven acá)
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  name text not null,
  active boolean not null default true,
  billing_type text not null check (billing_type in ('recurring', 'one_time')),
  reference_amount numeric(12, 2) not null check (reference_amount >= 0),
  reference_currency text not null check (reference_currency in ('USD', 'ARS')),
  -- Solo tiene sentido para recurring; one_time → null
  billing_mode text check (
    billing_mode is null or billing_mode in ('current_month', 'previous_month')
  ),
  due_day integer check (due_day is null or (due_day >= 1 and due_day <= 31)),
  start_date date not null,
  ended_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_ended_after_start check (ended_at is null or ended_at >= start_date),
  constraint services_recurring_requires_schedule check (
    (
      billing_type = 'recurring'
      and billing_mode is not null
      and due_day is not null
    )
    or (
      billing_type = 'one_time'
      and billing_mode is null
      and due_day is null
    )
  )
);

create index if not exists services_client_id_idx on public.services (client_id);
create index if not exists services_active_idx on public.services (active);
create index if not exists services_billing_type_idx on public.services (billing_type);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row
execute function public.panel_set_updated_at();

-- ---------------------------------------------------------------------------
-- charges (foto histórica por obligación)
-- ---------------------------------------------------------------------------
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  -- Mes del servicio (día 1). Null en one_time.
  period date,
  reference_amount numeric(12, 2) not null check (reference_amount >= 0),
  reference_currency text not null check (reference_currency in ('USD', 'ARS')),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint charges_period_is_month_start check (
    period is null or period = date_trunc('month', period)::date
  )
);

-- Un charge recurrente por servicio+período; one_time no usa period.
create unique index if not exists charges_service_period_unique
  on public.charges (service_id, period)
  where period is not null;

create index if not exists charges_service_id_idx on public.charges (service_id);
create index if not exists charges_due_date_idx on public.charges (due_date);
create index if not exists charges_period_idx on public.charges (period);

drop trigger if exists charges_set_updated_at on public.charges;
create trigger charges_set_updated_at
before update on public.charges
for each row
execute function public.panel_set_updated_at();

-- ---------------------------------------------------------------------------
-- payments (contrato vs dinero recibido; MEP al momento del pago)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges (id) on delete restrict,
  paid_at date not null,
  amount_received numeric(12, 2) not null check (amount_received >= 0),
  currency_received text not null check (currency_received in ('USD', 'ARS')),
  -- ARS por 1 USD cuando currency_received = ARS y reference_currency = USD.
  -- Null si no hubo conversión (misma moneda).
  exchange_rate numeric(14, 6) check (exchange_rate is null or exchange_rate > 0),
  reference_amount numeric(12, 2) not null check (reference_amount >= 0),
  reference_currency text not null check (reference_currency in ('USD', 'ARS')),
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_one_per_charge unique (charge_id),
  constraint payments_exchange_rate_when_converted check (
    (
      reference_currency = currency_received
      and exchange_rate is null
    )
    or (
      reference_currency <> currency_received
      and exchange_rate is not null
    )
  )
);

create index if not exists payments_charge_id_idx on public.payments (charge_id);
create index if not exists payments_paid_at_idx on public.payments (paid_at);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.panel_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS cerrado
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;

revoke all on table public.clients from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.charges from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

grant all on table public.clients to service_role;
grant all on table public.services to service_role;
grant all on table public.charges to service_role;
grant all on table public.payments to service_role;
