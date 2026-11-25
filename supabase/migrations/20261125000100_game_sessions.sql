create sequence public.game_nickname_number;
create table public.game_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null default ('보드여우-' || nextval('public.game_nickname_number')),
  real_name text,
  role text not null default 'user' check (role in ('user', 'super_admin'))
);

create table public.game_sessions (
  digest text primary key,
  player_id uuid not null references public.game_profiles(id) on delete cascade,
  expires_at timestamptz not null
);
create index game_sessions_expiry on public.game_sessions(expires_at);
alter table public.game_profiles enable row level security;
alter table public.game_sessions enable row level security;
revoke all on public.game_profiles, public.game_sessions from public, anon, authenticated;
revoke all on sequence public.game_nickname_number from public, anon, authenticated;
grant select, insert, update, delete on public.game_profiles, public.game_sessions to service_role;
grant usage on sequence public.game_nickname_number to service_role;

create function public.issue_game_session(p_user uuid, p_digest text, p_expires timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.game_profiles(id) values (p_user) on conflict (id) do nothing;
  delete from public.game_sessions where expires_at <= now();
  insert into public.game_sessions(digest, player_id, expires_at) values (p_digest, p_user, p_expires);
end;
$$;
revoke all on function public.issue_game_session(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.issue_game_session(uuid, text, timestamptz) to service_role;
