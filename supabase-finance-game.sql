-- Una sola vez: SQL Editor en supabase.com → New project → pega esto → Run.
-- Hosting (Vercel): env PUBLIC_FINANCE_SUPABASE_URL y PUBLIC_FINANCE_SUPABASE_ANON_KEY.
-- Después: la app guarda sola; en otro dispositivo abrís el enlace con ?sync=TU_UUID una vez.

create table if not exists public.finance_game_state (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.finance_game_state enable row level security;

create policy "finance_game_state_select" on public.finance_game_state for select using (true);
create policy "finance_game_state_insert" on public.finance_game_state for insert with check (true);
create policy "finance_game_state_update" on public.finance_game_state for update using (true) with check (true);
