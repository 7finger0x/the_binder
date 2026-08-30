-- User profiles (username for social discovery) and friend relationships.

create table if not exists user_profiles (
  user_id text primary key,
  username text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists user_profiles_username_lower_idx
  on user_profiles (lower(username));

create index if not exists user_profiles_username_idx on user_profiles (username);

create table if not exists friend_requests (
  id text primary key,
  requester_id text not null,
  addressee_id text not null,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friend_requests_addressee_pending_idx
  on friend_requests (addressee_id)
  where status = 'pending';

create index if not exists friend_requests_requester_idx
  on friend_requests (requester_id);

create index if not exists friend_requests_addressee_idx
  on friend_requests (addressee_id);
