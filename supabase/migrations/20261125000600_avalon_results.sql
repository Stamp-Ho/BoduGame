create table public.avalon_game_results (
  game_id uuid not null,
  room_id uuid not null,
  player_id uuid not null references public.game_profiles(id),
  player_name text not null,
  side text not null check (side in ('good', 'evil')),
  won boolean not null,
  best_player_votes integer not null default 0,
  completed_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create or replace function public.avalon_record_game_result()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.state->>'phase' is distinct from 'finished' and new.state->>'phase' = 'finished' then
    insert into public.avalon_game_results (game_id, room_id, player_id, player_name, side, won, best_player_votes)
    select coalesce((new.state->>'gameId')::uuid, new.id), new.id,
      (player.value->>'id')::uuid, profile.nickname,
      coalesce(player.value->>'currentSide', player.value->>'side'),
      coalesce(player.value->>'currentSide', player.value->>'side') = new.state->>'winner',
      coalesce((
        select count(*)::integer
        from jsonb_each(coalesce(new.state->'bestPlayerVotes', '{}'::jsonb)) as ballot(voter_id, target_id)
        where ballot.target_id <> 'null'::jsonb
          and ballot.target_id #>> '{}' = player.value->>'id'
      ), 0)
    from jsonb_array_elements(new.state->'players') as player(value)
    join public.game_profiles profile on profile.id = (player.value->>'id')::uuid
    on conflict (game_id, player_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger avalon_record_game_result
after update on public.avalon_rooms
for each row execute function public.avalon_record_game_result();

alter table public.avalon_game_results enable row level security;
revoke all on public.avalon_game_results from public, anon, authenticated;
grant select, insert, update, delete on public.avalon_game_results to service_role;
revoke all on function public.avalon_record_game_result() from public, anon, authenticated;
grant execute on function public.avalon_record_game_result() to service_role;
create view public.avalon_player_stats with (security_invoker = true) as
select player_id,
  (array_agg(player_name order by completed_at desc))[1] as player_name,
  count(*)::integer as games,
  count(*) filter (where won)::integer as wins,
  count(*) filter (where side = 'good')::integer as good_games,
  count(*) filter (where side = 'good' and won)::integer as good_wins,
  count(*) filter (where side = 'evil')::integer as evil_games,
  count(*) filter (where side = 'evil' and won)::integer as evil_wins
from public.avalon_game_results
group by player_id;
revoke all on public.avalon_player_stats from public, anon, authenticated;
grant select on public.avalon_player_stats to service_role;
-- Count each completed game once, regardless of its player count.
create view public.avalon_side_stats with (security_invoker = true) as
with game_winners as (
  select game_id,
    min(case when won then side when side = 'good' then 'evil' else 'good' end) as winner
  from public.avalon_game_results
  group by game_id
)
select count(*)::integer as games,
  count(*) filter (where winner = 'good')::integer as good_wins,
  count(*) filter (where winner = 'evil')::integer as evil_wins
from game_winners;

revoke all on public.avalon_side_stats from public, anon, authenticated;
grant select on public.avalon_side_stats to service_role;
