-- Una sola vez: SQL Editor en supabase.com → pega esto → Run.
-- Hosting (Vercel): env PUBLIC_FINANCE_SUPABASE_URL y PUBLIC_FINANCE_SUPABASE_ANON_KEY.
-- La app usa un id de fila fijo (ver DEFAULT_FINANCE_SYNC_ID en src/lib/finance/storage.ts).
-- Si el id tiene guiones, las lecturas REST deben usar comillas: id=in.("tu-id") (ver postgrest.ts).

create table if not exists public.finance_game_state (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

-- updated_at se actualiza en cada UPDATE (PostgREST upsert merge) sin mandar fecha desde el cliente.
create or replace function public.set_finance_game_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_finance_game_state_updated_at on public.finance_game_state;

create trigger set_finance_game_state_updated_at
before update on public.finance_game_state
for each row
execute function public.set_finance_game_state_updated_at();

alter table public.finance_game_state enable row level security;

drop policy if exists "finance_game_state_select" on public.finance_game_state;
drop policy if exists "finance_game_state_insert" on public.finance_game_state;
drop policy if exists "finance_game_state_update" on public.finance_game_state;

create policy "finance_game_state_select"
on public.finance_game_state
for select
to anon
using (true);

create policy "finance_game_state_insert"
on public.finance_game_state
for insert
to anon
with check (true);

create policy "finance_game_state_update"
on public.finance_game_state
for update
to anon
using (true)
with check (true);
