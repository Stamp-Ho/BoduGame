create table public.avalon_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.game_profiles(id),
  title text not null check (btrim(title) <> ''),
  is_private boolean not null default false,
  use_real_names boolean not null default false,
  join_code text unique,
  real_name_consents uuid[] not null default '{}',
  state jsonb not null check (jsonb_typeof(state->'players') = 'array' and state ? 'players'),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_private = (join_code is not null))
);
create index avalon_rooms_host_idx on public.avalon_rooms(host_user_id);
create index avalon_rooms_state_idx on public.avalon_rooms using gin(state jsonb_path_ops);

-- The server game engine owns state. This trigger also handles host succession and kicks.
create function public.prepare_avalon_room() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.host_user_id := (new.state->>'hostId')::uuid;
  if new.title is null or btrim(new.title) = '' then
    select nickname || '의 게임' into new.title from public.game_profiles where id = new.host_user_id;
  end if;
  if not new.is_private then new.join_code := null;
  elsif new.join_code is null then new.join_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
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
create trigger prepare_avalon_room before insert or update on public.avalon_rooms
for each row execute function public.prepare_avalon_room();

-- p_state is initialState(...) from the trusted server engine.
create function public.create_avalon_room(p_actor uuid,p_title text,p_private boolean,p_real_names boolean,p_state jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare room_id uuid;
begin
  perform id from public.game_profiles where id=p_actor for update;
  if not found or (p_state->>'hostId')::uuid is distinct from p_actor
    or p_state->>'phase' is distinct from 'lobby'
    or not (p_state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor))) then
    raise exception '방 생성 정보를 확인해 주세요.';
  end if;
  select id into room_id from public.avalon_rooms where state->>'phase'<>'finished'
    and state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor)) limit 1;
  if found then return room_id; end if;
  insert into public.avalon_rooms(host_user_id,title,is_private,use_real_names,state)
    values(p_actor,p_title,p_private,p_real_names,p_state) returning id into room_id;
  return room_id;
end;
$$;

create function public.avalon_lobby_code(p_room uuid,p_actor uuid)
returns text language sql stable set search_path = '' as $$
  select r.join_code from public.avalon_rooms r where r.id=p_room and r.state->>'phase'='lobby'
    and (r.state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor))
    or exists(select from public.game_profiles p where p.id=p_actor and p.role='super_admin'));
$$;

create function public.list_avalon_lobbies(p_actor uuid)
returns table(id uuid,title text,is_private boolean,use_real_names boolean,players integer)
language sql stable set search_path = '' as $$
  select r.id,r.title,r.is_private,r.use_real_names,jsonb_array_length(r.state->'players')
  from public.avalon_rooms r where r.state->>'phase' = 'lobby' and (not r.is_private or
    exists(select from public.game_profiles p where p.id = p_actor and p.role = 'super_admin'))
  order by r.created_at desc;
$$;

create function public.configure_avalon_lobby(p_room uuid,p_actor uuid,p_private boolean,p_real_names boolean)
returns void language plpgsql set search_path = '' as $$
begin
  update public.avalon_rooms r set is_private=p_private,use_real_names=p_real_names
    where r.id=p_room and r.state->>'phase'='lobby' and (r.host_user_id=p_actor or
      exists(select from public.game_profiles p where p.id=p_actor and p.role='super_admin'));
  if not found then raise exception '대기실 설정 권한이 필요합니다.'; end if;
end;
$$;

-- p_code alone identifies a private lobby. Existing members may reconnect in any phase.
create function public.join_avalon_room(p_actor uuid,p_room uuid,p_code text,p_accept_real_names boolean)
returns uuid language plpgsql set search_path = '' as $$
declare r public.avalon_rooms; actor public.game_profiles; already_joined boolean; code text := upper(btrim(p_code));
begin
  select * into strict actor from public.game_profiles where id=p_actor for update;
  select * into r from public.avalon_rooms where
    (p_room is not null and id=p_room) or (p_room is null and join_code=code) for update;
  if not found then raise exception '입장할 수 없는 방입니다.'; end if;
  already_joined := r.state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor));
  if not already_joined then
    if r.state->>'phase' <> 'lobby' or
      (r.is_private and actor.role <> 'super_admin' and r.join_code is distinct from code) or
      jsonb_array_length(r.state->'players') >= (r.state->'config'->>'playerCount')::integer
    then raise exception '입장할 수 없는 방입니다.'; end if;
    if exists(select from public.avalon_rooms other where other.id<>r.id and other.state->>'phase'<>'finished'
      and other.state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor))) then
      raise exception '이미 참여 중인 방이 있습니다.';
    end if;
    r.state := jsonb_set(r.state,'{players}',(r.state->'players') || jsonb_build_object(
      'id',p_actor,'name',actor.nickname,'seat',jsonb_array_length(r.state->'players'),
      'roles','[]'::jsonb,'side','good','currentSide','good','ready',false,'seen',false));
  end if;
  if r.use_real_names and not r.is_private and not (p_actor = any(r.real_name_consents)) then
    if p_accept_real_names is not true then raise exception '실명 사용 확인이 필요합니다.'; end if;
    r.real_name_consents := array_append(r.real_name_consents,p_actor);
  elsif already_joined then return r.id;
  end if;
  update public.avalon_rooms set state=r.state,real_name_consents=r.real_name_consents where id=r.id;
  return r.id;
end;
$$;

-- Room-only names. Canonical engine state and historical results use nicknames.
create function public.avalon_room_names(p_room uuid,p_actor uuid)
returns table(player_id uuid,display_name text) language sql stable set search_path = '' as $$
  select p.id,case when r.use_real_names and (r.is_private or p.id=any(r.real_name_consents))
    then coalesce(nullif(p.real_name,''),p.nickname) else p.nickname end
  from public.avalon_rooms r cross join lateral jsonb_array_elements(r.state->'players') member
  join public.game_profiles p on p.id=(member->>'id')::uuid
  where r.id=p_room and (r.state->'players' @> jsonb_build_array(jsonb_build_object('id',p_actor))
    or exists(select from public.game_profiles a where a.id=p_actor and a.role='super_admin'));
$$;
create table if not exists public.avalon_room_signals (
  room_id uuid primary key references public.avalon_rooms(id) on delete cascade,
  version bigint not null,
  updated_at timestamptz not null default now()
);
create or replace function public.avalon_signal_room_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.avalon_room_signals where room_id = old.id;
    return old;
  end if;
  insert into public.avalon_room_signals(room_id, version, updated_at)
  values(new.id, new.version, now())
  on conflict(room_id) do update set version = excluded.version, updated_at = excluded.updated_at;
  return new;
end;
$$;
create trigger avalon_room_change_signal
after insert or update or delete on public.avalon_rooms
for each row execute function public.avalon_signal_room_change();


alter table public.avalon_rooms enable row level security;
revoke all on public.avalon_rooms from public, anon, authenticated;
grant select, insert, update, delete on public.avalon_rooms to service_role;
alter table public.avalon_room_signals enable row level security;
revoke all on public.avalon_room_signals from public, anon, authenticated;
grant select, insert, update, delete on public.avalon_room_signals to service_role;
revoke all on function public.prepare_avalon_room() from public, anon, authenticated;
revoke all on function public.create_avalon_room(uuid,text,boolean,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.create_avalon_room(uuid,text,boolean,boolean,jsonb) to service_role;
revoke all on function public.avalon_lobby_code(uuid,uuid) from public, anon, authenticated;
grant execute on function public.avalon_lobby_code(uuid,uuid) to service_role;
grant execute on function public.prepare_avalon_room() to service_role;
revoke all on function public.list_avalon_lobbies(uuid) from public, anon, authenticated;
grant execute on function public.list_avalon_lobbies(uuid) to service_role;
revoke all on function public.configure_avalon_lobby(uuid,uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.configure_avalon_lobby(uuid,uuid,boolean,boolean) to service_role;
revoke all on function public.join_avalon_room(uuid,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.join_avalon_room(uuid,uuid,text,boolean) to service_role;
revoke all on function public.avalon_room_names(uuid,uuid) from public, anon, authenticated;
grant execute on function public.avalon_room_names(uuid,uuid) to service_role;
revoke all on function public.avalon_signal_room_change() from public, anon, authenticated;
grant execute on function public.avalon_signal_room_change() to service_role;
