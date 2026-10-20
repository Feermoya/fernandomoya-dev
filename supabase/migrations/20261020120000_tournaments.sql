-- Noche FC / Torneos — modelo v1
-- Proyecto Supabase dedicado recomendado (TOURNAMENTS_SUPABASE_*).
-- NO tocar tablas de finance_game_state ni panel cobros.
--
-- Seguridad: RLS ON + sin policies para anon/authenticated.
-- Acceso solo vía service_role desde SSR tras validar secreto/cookie.

create extension if not exists pgcrypto;

create or replace function public.tournament_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  name text not null,
  created_ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_groups_public_id_len check (char_length(public_id) between 16 and 32),
  constraint tournament_groups_name_len check (char_length(trim(name)) between 2 and 48)
);

create unique index if not exists tournament_groups_public_id_uidx
  on public.tournament_groups (public_id);

create index if not exists tournament_groups_created_ip_hash_idx
  on public.tournament_groups (created_ip_hash, created_at desc);

drop trigger if exists tournament_groups_set_updated_at on public.tournament_groups;
create trigger tournament_groups_set_updated_at
before update on public.tournament_groups
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- players (identidad estable dentro del grupo)
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups (id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_players_name_len check (char_length(trim(display_name)) between 1 and 32)
);

create index if not exists tournament_players_group_id_idx
  on public.tournament_players (group_id);

create index if not exists tournament_players_group_active_idx
  on public.tournament_players (group_id, active);

drop trigger if exists tournament_players_set_updated_at on public.tournament_players;
create trigger tournament_players_set_updated_at
before update on public.tournament_players
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- admin credentials (hashes only)
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_admin_credentials (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups (id) on delete cascade,
  secret_hash text not null,
  recovery_hash text not null,
  version integer not null default 1,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_admin_credentials_version_positive check (version >= 1)
);

create unique index if not exists tournament_admin_credentials_group_uidx
  on public.tournament_admin_credentials (group_id);

drop trigger if exists tournament_admin_credentials_set_updated_at on public.tournament_admin_credentials;
create trigger tournament_admin_credentials_set_updated_at
before update on public.tournament_admin_credentials
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- matchdays (fechas) — usadas desde etapa 2
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_matchdays (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups (id) on delete cascade,
  name text not null,
  status text not null default 'prepared',
  sequence_number integer not null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matchdays_status_check
    check (status in ('prepared', 'live', 'finished')),
  constraint tournament_matchdays_name_len check (char_length(trim(name)) between 1 and 64),
  constraint tournament_matchdays_sequence_positive check (sequence_number >= 1)
);

create unique index if not exists tournament_matchdays_group_sequence_uidx
  on public.tournament_matchdays (group_id, sequence_number);

create index if not exists tournament_matchdays_group_status_idx
  on public.tournament_matchdays (group_id, status);

drop trigger if exists tournament_matchdays_set_updated_at on public.tournament_matchdays;
create trigger tournament_matchdays_set_updated_at
before update on public.tournament_matchdays
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- matches — etapa 2+
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.tournament_matchdays (id) on delete cascade,
  mode text not null,
  sort_order integer not null default 0,
  score_home integer,
  score_away integer,
  simplified_outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matches_mode_check check (mode in ('solo', 'pairs')),
  constraint tournament_matches_scores_nonneg check (
    (score_home is null or score_home >= 0)
    and (score_away is null or score_away >= 0)
  ),
  constraint tournament_matches_simplified_check check (
    simplified_outcome is null
    or simplified_outcome in ('home', 'away', 'draw')
  ),
  constraint tournament_matches_result_xor check (
    (
      score_home is not null
      and score_away is not null
      and simplified_outcome is null
    )
    or (
      score_home is null
      and score_away is null
      and simplified_outcome is not null
    )
  )
);

create index if not exists tournament_matches_matchday_id_idx
  on public.tournament_matches (matchday_id, sort_order);

drop trigger if exists tournament_matches_set_updated_at on public.tournament_matches;
create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- match participants — parejas derivadas de aquí
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_matches (id) on delete cascade,
  player_id uuid not null references public.tournament_players (id) on delete restrict,
  side text not null,
  slot smallint not null,
  created_at timestamptz not null default now(),
  constraint tournament_match_participants_side_check check (side in ('home', 'away')),
  constraint tournament_match_participants_slot_check check (slot in (0, 1)),
  constraint tournament_match_participants_unique_player unique (match_id, player_id),
  constraint tournament_match_participants_unique_slot unique (match_id, side, slot)
);

create index if not exists tournament_match_participants_match_id_idx
  on public.tournament_match_participants (match_id);

create index if not exists tournament_match_participants_player_id_idx
  on public.tournament_match_participants (player_id);

-- ---------------------------------------------------------------------------
-- awards — etapa 4
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_awards (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.tournament_matchdays (id) on delete cascade,
  award_type text not null,
  player_id uuid references public.tournament_players (id) on delete set null,
  player_b_id uuid references public.tournament_players (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_awards_type_len check (char_length(award_type) between 2 and 48),
  constraint tournament_awards_note_len check (note is null or char_length(note) <= 280)
);

create index if not exists tournament_awards_matchday_id_idx
  on public.tournament_awards (matchday_id);

drop trigger if exists tournament_awards_set_updated_at on public.tournament_awards;
create trigger tournament_awards_set_updated_at
before update on public.tournament_awards
for each row
execute function public.tournament_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: cerrado a anon/authenticated
-- ---------------------------------------------------------------------------
alter table public.tournament_groups enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_admin_credentials enable row level security;
alter table public.tournament_matchdays enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_match_participants enable row level security;
alter table public.tournament_awards enable row level security;

revoke all on public.tournament_groups from anon, authenticated;
revoke all on public.tournament_players from anon, authenticated;
revoke all on public.tournament_admin_credentials from anon, authenticated;
revoke all on public.tournament_matchdays from anon, authenticated;
revoke all on public.tournament_matches from anon, authenticated;
revoke all on public.tournament_match_participants from anon, authenticated;
revoke all on public.tournament_awards from anon, authenticated;

grant all on public.tournament_groups to service_role;
grant all on public.tournament_players to service_role;
grant all on public.tournament_admin_credentials to service_role;
grant all on public.tournament_matchdays to service_role;
grant all on public.tournament_matches to service_role;
grant all on public.tournament_match_participants to service_role;
grant all on public.tournament_awards to service_role;
