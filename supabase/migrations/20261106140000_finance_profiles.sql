-- Relación entre una cuenta de Supabase Auth y su libro en finance_game_state.
-- No modifica filas existentes de finance_game_state.
-- No cierra las políticas anónimas: eso está en la migración siguiente
-- y solo debe ejecutarse después de desplegar la API nueva.

create table if not exists public.finance_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  state_id text not null unique references public.finance_game_state (id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.finance_profiles enable row level security;

revoke all on table public.finance_profiles from anon, authenticated;
grant select, insert, update, delete on table public.finance_profiles to service_role;
