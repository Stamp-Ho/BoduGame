create or replace function public.prepare_avalon_room() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.host_user_id := (new.state->>'hostId')::uuid;
  if new.title is null or btrim(new.title) = '' then
    select nickname || '의 게임' into new.title from public.game_profiles where id = new.host_user_id;
  end if;
  if not new.is_private then new.join_code := null;
  elsif new.join_code is null then
    -- Serialize allocation so concurrent room creation cannot reserve the same code.
    perform pg_catalog.pg_advisory_xact_lock(624819031);
    loop
      new.join_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
      exit when not exists (select from public.avalon_rooms where join_code = new.join_code);
    end loop;
  end if;
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.updated_at := clock_timestamp();
    if (old.use_real_names,old.is_private) is distinct from (new.use_real_names,new.is_private) then
      new.real_name_consents := '{}';
    end if;
  elsif new.use_real_names and not new.is_private then
    new.real_name_consents := array[new.host_user_id];
  end if;
  new.real_name_consents := array(select distinct actor from unnest(new.real_name_consents) actor
    where new.state->'players' @> jsonb_build_array(jsonb_build_object('id',actor)));
  return new;
end;
$$;
