-- Phase 2: showcase avatar, wishlist visibility, featured collections.

alter table shares add column if not exists avatar_url text;
alter table shares add column if not exists show_wishlist boolean not null default false;
alter table shares add column if not exists featured boolean not null default false;

create index if not exists shares_featured_idx on shares (featured) where featured = true;
