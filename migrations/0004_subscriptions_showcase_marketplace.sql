-- Stripe subscriptions, showcase profile fields, marketplace listings.

create table if not exists subscriptions (
  user_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table shares add column if not exists display_name text;
alter table shares add column if not exists bio text;
alter table shares add column if not exists hide_values boolean not null default false;
alter table shares add column if not exists show_trade_list boolean not null default true;
alter table shares add column if not exists show_want_list boolean not null default true;

create table if not exists listings (
  id text primary key,
  seller_id text not null,
  card_id text not null,
  title text not null,
  asking_price numeric(12, 2) not null,
  condition text,
  description text,
  status text not null default 'active' check (status in ('active', 'sold', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on listings (status);
create index if not exists listings_seller_idx on listings (seller_id);

create table if not exists listing_messages (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_messages_listing_idx on listing_messages (listing_id);
