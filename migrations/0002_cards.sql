create table if not exists cards (
  id text primary key,
  user_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists cards_user_id_idx on cards (user_id);

create table if not exists shares (
  id text primary key,
  user_id text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists shares_slug_idx on shares (slug);
