create table public.boardgames (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  grid_rows smallint not null check (grid_rows between 3 and 20),
  grid_cols smallint not null check (grid_cols between 3 and 20),
  is_public boolean not null default false,
  owner_id uuid not null
    references public.game_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boardgame_tiles (
  boardgame_id uuid not null
    references public.boardgames (id) on delete cascade,
  id text not null,
  category text not null check (category in ('OUTER', 'INNER', 'SPECIAL_DECK')),
  grid_row integer not null check (grid_row >= 0),
  grid_col integer not null check (grid_col >= 0),
  label text not null default '',
  sub_label text not null default '',
  color text,
  text_color text,
  icon text,
  action_type text not null default 'NONE'
    check (action_type in (
      'NONE', 'MOVE_STEPS', 'DIRECTION_CHANGE', 'TELEPORT',
      'SPLIT_CHOICE', 'DRAW_GOLD_CARD', 'CUSTOM_SCRIPT', 'SKIP_TURNS'
    )),
  action_params jsonb not null default '{}'::jsonb
    check (jsonb_typeof(action_params) = 'object'),
  is_locked boolean not null default false,
  locked_by_user_id uuid
    references public.game_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (boardgame_id, id),
  constraint boardgame_tiles_grid_position_unique unique (boardgame_id, grid_row, grid_col)
);

-- A row per directed connection preserves ordering and validates both tile references.
create table public.boardgame_tile_next (
  boardgame_id uuid not null,
  source_tile_id text not null,
  target_tile_id text not null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  primary key (boardgame_id, source_tile_id, target_tile_id),
  constraint boardgame_tile_next_source_fk
    foreign key (boardgame_id, source_tile_id)
    references public.boardgame_tiles (boardgame_id, id) on delete cascade,
  constraint boardgame_tile_next_target_fk
    foreign key (boardgame_id, target_tile_id)
    references public.boardgame_tiles (boardgame_id, id) on delete cascade,
  constraint boardgame_tile_next_order_unique unique (boardgame_id, source_tile_id, sort_order)
);

create table public.boardgame_gold_cards (
  boardgame_id uuid not null
    references public.boardgames (id) on delete cascade,
  id text not null,
  title text not null default '',
  description text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  event_type text not null default 'TEXT'
    check (event_type in (
      'TEXT', 'MOVE_PAWN_SPECIFIED', 'MOVE_PAWN_CHOOSE', 'SWAP_POSITIONS_CHOOSE'
    )),
  event_params jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_params) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (boardgame_id, id),
  constraint boardgame_gold_cards_sort_order_unique unique (boardgame_id, sort_order)
);

create index if not exists boardgames_owner_id_idx
  on public.boardgames (owner_id);

create index if not exists boardgame_tiles_boardgame_grid_idx
  on public.boardgame_tiles (boardgame_id, grid_row, grid_col);
create index if not exists boardgame_gold_cards_order_idx
  on public.boardgame_gold_cards (boardgame_id, sort_order);


alter table public.boardgames enable row level security;
revoke all on public.boardgames from public, anon, authenticated;
grant select, insert, update, delete on public.boardgames to service_role;
alter table public.boardgame_tiles enable row level security;
revoke all on public.boardgame_tiles from public, anon, authenticated;
grant select, insert, update, delete on public.boardgame_tiles to service_role;
alter table public.boardgame_tile_next enable row level security;
revoke all on public.boardgame_tile_next from public, anon, authenticated;
grant select, insert, update, delete on public.boardgame_tile_next to service_role;
alter table public.boardgame_gold_cards enable row level security;
revoke all on public.boardgame_gold_cards from public, anon, authenticated;
grant select, insert, update, delete on public.boardgame_gold_cards to service_role;
