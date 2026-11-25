alter table public.game_profiles add column allow_real_name_invites boolean not null default false;

-- A receipt exists even for an unresolved email or real name. Only nickname
-- invitations expose the matched nickname in the management interface.
create table public.boardgame_grants (
  id uuid primary key default gen_random_uuid(),
  boardgame_id uuid not null references public.boardgames(id) on delete cascade,
  recipient_id uuid references public.game_profiles(id) on delete set null,
  lookup_kind text not null check (lookup_kind in ('nickname','real_name','email')),
  permission text not null check (permission in ('viewer','editor')),
  created_at timestamptz not null default now(),
  check (lookup_kind = 'nickname' or permission = 'editor')
);
create index boardgame_grants_recipient on public.boardgame_grants(boardgame_id, recipient_id);

-- p_actor comes exclusively from the Next.js server's verified session.
create function public.boardgame_access(p_board uuid, p_actor uuid)
returns text language sql stable set search_path = '' as $$
  select case
    when b.owner_id = p_actor or exists (select from public.game_profiles p
      where p.id = p_actor and p.role = 'super_admin') then 'owner'
    when exists (select from public.boardgame_grants g where g.boardgame_id = b.id
      and g.recipient_id = p_actor and g.permission = 'editor') then 'editor'
    when b.is_public or exists (select from public.boardgame_grants g where g.boardgame_id = b.id
      and g.recipient_id = p_actor) then 'viewer'
  end from public.boardgames b where b.id = p_board;
$$;

create function public.list_boardgames(p_actor uuid, p_mine boolean default false)
returns table(id uuid, name text, is_public boolean, access_level text)
language sql stable set search_path = '' as $$
  select b.id, b.name, b.is_public, a.level from public.boardgames b
  cross join lateral (select public.boardgame_access(b.id, p_actor) as level) a
  where a.level is not null and (not p_mine or b.owner_id = p_actor or exists (
    select from public.boardgame_grants g where g.boardgame_id = b.id and g.recipient_id = p_actor))
  order by b.created_at desc, b.id;
$$;

create function public.read_boardgame(p_board uuid, p_actor uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'name', b.name, 'grid_rows', b.grid_rows, 'grid_cols', b.grid_cols,
    'tiles', coalesce((select jsonb_agg(to_jsonb(t) - 'locked_by_user_id' order by t.id)
      from public.boardgame_tiles t where t.boardgame_id = b.id), '[]'),
    'edges', coalesce((select jsonb_agg(e order by e.source_tile_id,e.sort_order)
      from public.boardgame_tile_next e where e.boardgame_id = b.id), '[]'),
    'cards', coalesce((select jsonb_agg(c order by c.sort_order)
      from public.boardgame_gold_cards c where c.boardgame_id = b.id), '[]'))
  from public.boardgames b where b.id = p_board and public.boardgame_access(b.id,p_actor) is not null;
$$;

create function public.manage_boardgame(p_board uuid, p_actor uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if public.boardgame_access(p_board,p_actor) is distinct from 'owner' then
    raise exception '보드 관리 권한이 필요합니다.' using errcode = '42501';
  end if;
end;
$$;

create function public.set_boardgame_visibility(p_board uuid, p_actor uuid, p_public boolean)
returns void language plpgsql set search_path = '' as $$
begin
  perform public.manage_boardgame(p_board,p_actor);
  update public.boardgames set is_public = p_public where id = p_board;
end;
$$;

create function public.share_boardgame(p_board uuid, p_actor uuid, p_kind text, p_value text, p_permission text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid; receipt uuid; matches uuid[]; value text := btrim(p_value);
begin
  perform public.manage_boardgame(p_board,p_actor);
  if nullif(value,'') is null then raise exception '초대 대상을 입력해 주세요.'; end if;
  case p_kind
    when 'nickname' then
      select id into strict target from public.game_profiles where nickname = value;
    when 'email' then
      select array_agg(p.id) into matches from public.game_profiles p join auth.users u on u.id = p.id
        where lower(u.email) = lower(value) and u.email_confirmed_at is not null;
    when 'real_name' then
      select array_agg(id) into matches from public.game_profiles
        where real_name = value and allow_real_name_invites;
    else raise exception '지원하지 않는 초대 방식입니다.';
  end case;
  if cardinality(matches) = 1 then target := matches[1]; end if;
  insert into public.boardgame_grants(boardgame_id, recipient_id, lookup_kind, permission)
    values (p_board,target,p_kind,case when p_kind = 'nickname' then p_permission else 'editor' end)
    returning id into receipt;
  return receipt;
end;
$$;

create function public.list_boardgame_grants(p_board uuid,p_actor uuid)
returns table(receipt uuid, created_at timestamptz, permission text, nickname text)
language plpgsql stable set search_path = '' as $$
begin
  perform public.manage_boardgame(p_board,p_actor);
  return query select g.id,g.created_at,g.permission,
    case when g.lookup_kind = 'nickname' then p.nickname end
    from public.boardgame_grants g left join public.game_profiles p on p.id = g.recipient_id
    where g.boardgame_id = p_board order by g.created_at,g.id;
end;
$$;

create function public.revoke_boardgame_grant(p_board uuid,p_actor uuid,p_receipt uuid)
returns void language plpgsql set search_path = '' as $$
begin
  perform public.manage_boardgame(p_board,p_actor);
  delete from public.boardgame_grants where boardgame_id = p_board and id = p_receipt;
end;
$$;
alter table public.boardgame_grants enable row level security;
revoke all on public.boardgame_grants from public, anon, authenticated;
grant select, insert, update, delete on public.boardgame_grants to service_role;
revoke all on function public.boardgame_access(uuid,uuid) from public, anon, authenticated;
grant execute on function public.boardgame_access(uuid,uuid) to service_role;
revoke all on function public.list_boardgames(uuid,boolean) from public, anon, authenticated;
grant execute on function public.list_boardgames(uuid,boolean) to service_role;
revoke all on function public.read_boardgame(uuid,uuid) from public, anon, authenticated;
grant execute on function public.read_boardgame(uuid,uuid) to service_role;
revoke all on function public.manage_boardgame(uuid,uuid) from public, anon, authenticated;
grant execute on function public.manage_boardgame(uuid,uuid) to service_role;
revoke all on function public.set_boardgame_visibility(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.set_boardgame_visibility(uuid,uuid,boolean) to service_role;
revoke all on function public.share_boardgame(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.share_boardgame(uuid,uuid,text,text,text) to service_role;
revoke all on function public.list_boardgame_grants(uuid,uuid) from public, anon, authenticated;
grant execute on function public.list_boardgame_grants(uuid,uuid) to service_role;
revoke all on function public.revoke_boardgame_grant(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.revoke_boardgame_grant(uuid,uuid,uuid) to service_role;
