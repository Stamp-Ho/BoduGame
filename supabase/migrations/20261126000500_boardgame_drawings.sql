
create table public.boardgame_drawings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.game_profiles(id),
 name text not null check(length(name) between 1 and 80),
 width integer not null default 512 check(width=512),
 height integer not null check(height in (512,819)),
 path text not null,
 version integer not null default 1
);
alter table public.boardgame_drawings enable row level security;
revoke all on public.boardgame_drawings from public, anon, authenticated;
grant all on public.boardgame_drawings to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('boardgame-drawings','boardgame-drawings',false,1048576,array['image/png'])
on conflict(id) do nothing;
alter publication supabase_realtime add table public.boardgame_drawings;

create function public.unlink_deleted_drawing() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.boardgame_tiles set action_params = action_params - 'drawingId' - 'drawingVersion'
    where action_params->>'drawingId' = old.id::text;
  return old;
end;
$$;
create trigger unlink_deleted_drawing before delete on public.boardgame_drawings
for each row execute function public.unlink_deleted_drawing();
revoke all on function public.unlink_deleted_drawing() from public,anon,authenticated;
