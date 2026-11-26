-- Signals contain no role, ballot, or real-name information.
alter table public.avalon_room_signals replica identity full;
do $$
begin
  if not exists (
    select from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avalon_room_signals'
  ) then
    alter publication supabase_realtime add table public.avalon_room_signals;
  end if;
end;
$$;
