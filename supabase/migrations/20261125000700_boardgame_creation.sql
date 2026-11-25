-- Lock the creator's profile so concurrent creates for the same account see
-- each other's committed boards before checking the quota.
create function public.create_boardgame(p_actor uuid, p_name text, p_rows integer, p_cols integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  board public.boardgames;
begin
  select role into strict actor_role from public.game_profiles
    where id = p_actor for no key update;
  if actor_role <> 'super_admin' and
     (select count(*) from public.boardgames where owner_id = p_actor) >= 2 then
    raise exception '주루마블은 계정당 최대 2개까지 만들 수 있습니다.';
  end if;

  insert into public.boardgames(owner_id, name, grid_rows, grid_cols)
    values (p_actor, btrim(p_name), p_rows, p_cols) returning * into board;
  return jsonb_build_object('id', board.id, 'name', board.name, 'is_public', board.is_public,
    'grid_rows', board.grid_rows, 'grid_cols', board.grid_cols);
end;
$$;

-- The existing access function grants administrators management rights on
-- every board. Check owner_id separately for the creator filter.
create function public.boardgame_catalog(p_actor uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'is_public', b.is_public,
    'is_owner', b.owner_id is not distinct from p_actor,
    'can_manage', a.level = 'owner', 'can_edit', a.level in ('owner','editor')
  ) order by b.created_at desc, b.id), '[]'::jsonb)
  from public.boardgames b
  cross join lateral (select public.boardgame_access(b.id, p_actor) as level) a
  where a.level is not null;
$$;

revoke all on function public.create_boardgame(uuid,text,integer,integer),
  public.boardgame_catalog(uuid) from public, anon, authenticated;
grant execute on function public.create_boardgame(uuid,text,integer,integer),
  public.boardgame_catalog(uuid) to service_role;
