-- Cierra el acceso anónimo a los libros financieros.
-- Ejecutar solo después de desplegar la API que usa service_role y la sesión.
-- No hace UPDATE ni DELETE de filas. No toca el JSON.
-- Si la app nueva todavía no está en producción, no ejecutes este archivo:
-- la versión anterior lee con la clave anónima y dejaría de sincronizar.

drop policy if exists "finance_game_state_select" on public.finance_game_state;
drop policy if exists "finance_game_state_insert" on public.finance_game_state;
drop policy if exists "finance_game_state_update" on public.finance_game_state;

revoke all on table public.finance_game_state from anon, authenticated;
grant select, insert, update, delete on table public.finance_game_state to service_role;

-- Rollback, solo si la app nueva todavía no puede leer y necesitás volver
-- a la versión anterior. No modifica filas.
-- grant select, insert, update on table public.finance_game_state to anon;
-- create policy "finance_game_state_select" on public.finance_game_state for select to anon using (true);
-- create policy "finance_game_state_insert" on public.finance_game_state for insert to anon with check (true);
-- create policy "finance_game_state_update" on public.finance_game_state for update to anon using (true) with check (true);
