-- Cuadros compartidos por fecha. La API del servidor controla las escrituras.
create table if not exists public.tournament_plans (
  matchday_id uuid primary key references public.tournament_matchdays(id) on delete cascade,
  group_id uuid not null references public.tournament_groups(id) on delete cascade,
  plan jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists tournament_plans_group_id_idx on public.tournament_plans(group_id);
alter table public.tournament_plans enable row level security;
revoke all on public.tournament_plans from anon, authenticated;
