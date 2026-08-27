-- Pikaboo order desk — full schema, storage buckets, and security policies.
-- Paste this whole file into the Supabase SQL editor (Project > SQL Editor > New query) and click Run.
-- Safe to re-run: everything is guarded with IF NOT EXISTS / DROP ... IF EXISTS.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Sequences for human-friendly order/idea numbers (PKB-1000, IDEA-1000, ...)
-- ---------------------------------------------------------------------------
create sequence if not exists order_no_seq start 1000;
create sequence if not exists request_no_seq start 1000;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text not null default '',
  price numeric not null default 15 check (price >= 0),
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Design options within a print (e.g. different keychain shapes) — like an
-- Amazon-style variant picker. Optional: a product with zero or one variant
-- just skips the picker on the order form.
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  photo_url text,
  sort_order integer not null default 0
);
create index if not exists product_variants_product_idx on product_variants (product_id, sort_order);

create table if not exists colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text not null default '#f9b8d6',
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('PKB-' || nextval('order_no_seq')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'printing', 'ready', 'done')),
  product_name text not null,
  size_label text not null,
  variant_name text,
  qty integer not null default 1 check (qty >= 1),
  rush boolean not null default false,
  resin boolean not null default false,
  colors jsonb not null default '[]'::jsonb,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  method text not null check (method in ('ship', 'pickup')),
  address jsonb,
  notes text not null default '',
  total numeric not null default 0,
  tracking_number text,
  payment_preference text check (payment_preference in ('electronic', 'in_person')),
  picked_up_by text,
  pickup_location text,
  assigned_to text,
  placed_at timestamptz not null default now()
);

-- Safe to re-run against a database that already has the orders table from
-- an earlier version of this script (before tracking numbers / resin / payment preference / picked-up-by / pickup location / assigned-to existed).
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists picked_up_by text;
alter table orders add column if not exists pickup_location text;
alter table orders add column if not exists assigned_to text;
alter table orders add column if not exists variant_name text;
alter table orders add column if not exists resin boolean not null default false;
alter table orders add column if not exists payment_preference text check (payment_preference in ('electronic', 'in_person'));

create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique default ('IDEA-' || nextval('request_no_seq')),
  status text not null default 'new' check (status in ('new', 'replied', 'added')),
  idea text not null,
  colors text not null default '',
  budget text not null default '',
  suggested_price numeric,
  customer_name text not null default '',
  contact text not null,
  photo_url text,
  reply_message text,
  created_at timestamptz not null default now()
);

alter table custom_requests add column if not exists reply_message text;

-- Single-row table for shop-wide on/off switches the admin controls from
-- the Studio (e.g. temporarily hiding the resin add-on while out of stock).
create table if not exists shop_settings (
  id smallint primary key default 1 check (id = 1),
  resin_available boolean not null default true,
  default_shipping_rate numeric not null default 6 check (default_shipping_rate >= 0)
);
insert into shop_settings (id) values (1) on conflict (id) do nothing;
alter table shop_settings add column if not exists default_shipping_rate numeric not null default 6;

-- Per-state shipping overrides. A state not listed here falls back to
-- shop_settings.default_shipping_rate.
create table if not exists shipping_rates (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  rate numeric not null default 6 check (rate >= 0)
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_placed_at_idx on orders (placed_at desc);
create index if not exists custom_requests_status_idx on custom_requests (status);
create index if not exists products_sort_idx on products (sort_order);
create index if not exists colors_sort_idx on colors (sort_order);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public (anon) visitors may read the live catalog and create orders/ideas.
-- Only a signed-in user (Genny, via Supabase Auth) can read orders/ideas or
-- edit the catalog. This project has exactly one admin account, so
-- "authenticated" == "admin" — see setup instructions for creating it.
-- ---------------------------------------------------------------------------
alter table products enable row level security;
alter table product_variants enable row level security;
alter table colors enable row level security;
alter table orders enable row level security;
alter table custom_requests enable row level security;
alter table shop_settings enable row level security;
alter table shipping_rates enable row level security;

drop policy if exists "products are publicly readable" on products;
create policy "products are publicly readable" on products
  for select using (true);

drop policy if exists "admin manages products" on products;
create policy "admin manages products" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "product variants are publicly readable" on product_variants;
create policy "product variants are publicly readable" on product_variants
  for select using (true);

drop policy if exists "admin manages product variants" on product_variants;
create policy "admin manages product variants" on product_variants
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "colors are publicly readable" on colors;
create policy "colors are publicly readable" on colors
  for select using (true);

drop policy if exists "admin manages colors" on colors;
create policy "admin manages colors" on colors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Orders: the public order form creates rows through the server-side
-- /api/orders route (using the service role key), not directly from the
-- browser, so no public insert policy is needed here. Only the admin can
-- read, update, or delete orders.
drop policy if exists "admin manages orders" on orders;
create policy "admin manages orders" on orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin manages custom_requests" on custom_requests;
create policy "admin manages custom_requests" on custom_requests
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "shop settings are publicly readable" on shop_settings;
create policy "shop settings are publicly readable" on shop_settings
  for select using (true);

drop policy if exists "admin manages shop settings" on shop_settings;
create policy "admin manages shop settings" on shop_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "shipping rates are publicly readable" on shipping_rates;
create policy "shipping rates are publicly readable" on shipping_rates
  for select using (true);

drop policy if exists "admin manages shipping rates" on shipping_rates;
create policy "admin manages shipping rates" on shipping_rates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Realtime — let the Studio dashboard update live as orders/ideas come in
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'custom_requests'
  ) then
    alter publication supabase_realtime add table custom_requests;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets
--   product-photos    : catalog photos, uploaded by the admin, public to view
--   reference-photos  : customer-attached reference photos, public to view,
--                        anyone may upload (there's no login on the order form)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('reference-photos', 'reference-photos', true)
  on conflict (id) do nothing;

drop policy if exists "product photos are publicly readable" on storage.objects;
create policy "product photos are publicly readable" on storage.objects
  for select using (bucket_id = 'product-photos');

drop policy if exists "admin manages product photos" on storage.objects;
create policy "admin manages product photos" on storage.objects
  for all using (bucket_id = 'product-photos' and auth.role() = 'authenticated')
  with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');

drop policy if exists "reference photos are publicly readable" on storage.objects;
create policy "reference photos are publicly readable" on storage.objects
  for select using (bucket_id = 'reference-photos');

drop policy if exists "anyone can upload a reference photo" on storage.objects;
create policy "anyone can upload a reference photo" on storage.objects
  for insert with check (bucket_id = 'reference-photos');

-- ---------------------------------------------------------------------------
-- Seed the default catalog (only runs the first time — skipped if you've
-- already got products/colors saved, e.g. from re-running this script)
-- ---------------------------------------------------------------------------
insert into products (name, blurb, price, sort_order)
select * from (values
  ('Flexi Axolotl', 'Wiggly articulated buddy, 14cm', 18::numeric, 1),
  ('Baby Dragon', 'Articulated, sits or stands', 24::numeric, 2),
  ('Daisy Keychain', 'Clip-on flower charm', 8::numeric, 3),
  ('Heart Shaker Charm', 'Filled with tiny beads', 12::numeric, 4),
  ('Name Plate Sign', 'Up to 10 bubble letters', 16::numeric, 5),
  ('Bunny Planter', 'Fits a 3in succulent', 22::numeric, 6)
) as seed(name, blurb, price, sort_order)
where not exists (select 1 from products);

insert into colors (name, hex, sort_order)
select * from (values
  ('Bubblegum', '#F77CB6', 1),
  ('Hot Pink', '#EC3D84', 2),
  ('Cotton Candy', '#F9B8D6', 3),
  ('Lilac', '#C8A2FF', 4),
  ('Sky', '#8FD4FF', 5),
  ('Mint', '#A8EFC6', 6),
  ('Sunny', '#FFD84D', 7),
  ('Peach', '#FFB48F', 8),
  ('Coconut', '#FFFDF8', 9),
  ('Licorice', '#2B1B26', 10),
  ('Glitter Rose', '#EE6398', 11),
  ('Glow Green', '#C9F76F', 12)
) as seed(name, hex, sort_order)
where not exists (select 1 from colors);
