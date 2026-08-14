-- Borrar datos demo del panel (seed).

delete from public.payments
where notes = '[seed-demo]'
   or charge_id in (
     select ch.id
     from public.charges ch
     join public.services s on s.id = ch.service_id
     join public.clients c on c.id = s.client_id
     where c.notes = '[seed-demo]' or s.notes = '[seed-demo]'
   );

delete from public.charges
where service_id in (
  select s.id
  from public.services s
  join public.clients c on c.id = s.client_id
  where c.notes = '[seed-demo]' or s.notes = '[seed-demo]'
);

delete from public.services
where notes = '[seed-demo]'
   or client_id in (select id from public.clients where notes = '[seed-demo]');

delete from public.clients
where notes = '[seed-demo]';
