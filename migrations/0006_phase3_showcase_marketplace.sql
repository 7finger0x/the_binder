-- Phase 3: multiple showcases per Pro user + marketplace commission polish.

alter table shares add column if not exists name text;
alter table shares add column if not exists is_default boolean not null default false;
alter table shares add column if not exists filter_mode text not null default 'all';
alter table shares add column if not exists filter_stacks jsonb not null default '[]'::jsonb;

update shares
set
  name = coalesce(nullif(trim(display_name), ''), 'Main showcase'),
  is_default = true
where name is null or trim(name) = '';

alter table listings add column if not exists commission_rate numeric(5, 4) not null default 0.08;

-- Keep one active listing per seller/card before adding the partial unique index.
update listings l
set status = 'withdrawn', updated_at = now()
from (
  select id,
    row_number() over (partition by seller_id, card_id order by created_at desc, id desc) as rn
  from listings
  where status = 'active'
) d
where l.id = d.id and d.rn > 1;

create unique index if not exists listings_one_active_per_card_idx
  on listings (seller_id, card_id)
  where status = 'active';

create table if not exists showcase_cards (
  showcase_id text not null references shares (id) on delete cascade,
  card_id text not null,
  primary key (showcase_id, card_id)
);

create index if not exists showcase_cards_showcase_idx on showcase_cards (showcase_id);
