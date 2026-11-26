do $$
declare target text;
begin
  foreach target in array array['boardgames','boardgame_grants','boardgame_tiles','boardgame_tile_next','boardgame_gold_cards']
  loop
    if not exists (
      select from pg_publication_tables where pubname='supabase_realtime'
        and schemaname='public' and tablename=target
    ) then
      execute format('alter publication supabase_realtime add table public.%I',target);
    end if;
  end loop;
end;
$$;
