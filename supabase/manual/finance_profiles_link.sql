-- MANUAL. No forma parte de las migraciones automáticas.
-- No actualiza fernando-foco-financiero-main ni la fila legacy.
-- Reemplazá los UUID y los correos antes de ejecutar.
--
-- 1) Authentication → Users: creá cada usuario con contraseña, o enviales una invitación.
--    Desactivá el registro público en Authentication → Sign In / Providers.
-- 2) Copiá el UUID de cada usuario.
-- 3) Ejecutá primero el INSERT de tu perfil. Comprobá que no cambió el libro.
-- 4) Ejecutá el alta del segundo libro y su perfil.

-- Tu cuenta, apuntando al libro que ya existe.
insert into public.finance_profiles (user_id, email, state_id)
values (
  '00000000-0000-4000-8000-000000000001',
  'tu-correo@ejemplo.com',
  'fernando-foco-financiero-main'
)
on conflict (user_id) do nothing;

-- Libro nuevo, vacío, para la otra cuenta.
insert into public.finance_game_state (id, body)
values (
  '00000000-0000-4000-8000-000000000002',
  jsonb_build_object(
    'entries', '[]'::jsonb,
    'goals', '[]'::jsonb,
    'challenges', '[]'::jsonb,
    'currentMonth', to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM'),
    'monthlyInvestmentPlan', '[]'::jsonb,
    'portfolioHoldings', '[]'::jsonb,
    'bitcoin', '{"targetIbitPercent":65,"btcQuantity":0}'::jsonb,
    'preferences', '{"quickAmounts":[50000,100000,200000,500000],"reminder":{"enabled":false,"phoneDigits":"","daysOfMonth":[5,15,25],"marketWhatsAppEnabled":false}}'::jsonb
  )
)
on conflict (id) do nothing;

insert into public.finance_profiles (user_id, email, state_id)
values (
  '00000000-0000-4000-8000-000000000003',
  'hermano@ejemplo.com',
  '00000000-0000-4000-8000-000000000002'
)
on conflict (user_id) do nothing;

-- Comprobación de solo lectura. El hash de tu libro no tiene que cambiar.
-- select id, updated_at, md5(body::text), jsonb_array_length(body->'entries')
-- from public.finance_game_state
-- order by updated_at desc;
