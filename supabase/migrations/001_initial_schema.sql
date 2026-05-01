-- MedCompare initial schema
-- Run this in the Supabase SQL editor at: https://supabase.com/dashboard/project/ligjhhhybwtgsdrsujrd/sql/new

-- ─── medicines ────────────────────────────────────────────────────────────────
create table if not exists medicines (
  id                uuid primary key default gen_random_uuid(),
  brand_name        text not null,
  salt_name         text not null,
  manufacturer      text,
  category          text,
  form              text,
  strength          text,
  pack_size         text,
  nppa_ceiling      numeric(10, 2),
  slug              text not null unique,
  has_generic       boolean not null default false,
  source            text not null default 'nppa',
  source_file       text,
  source_row_hash   text unique,
  source_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists medicines_salt_name_idx  on medicines (salt_name);
create index if not exists medicines_brand_name_idx on medicines (brand_name);
create index if not exists medicines_slug_idx        on medicines (slug);

-- full-text search index (brand + salt combined)
create index if not exists medicines_fts_idx on medicines
  using gin (to_tsvector('english', coalesce(brand_name, '') || ' ' || coalesce(salt_name, '')));

-- ─── prices ───────────────────────────────────────────────────────────────────
create table if not exists prices (
  id             uuid primary key default gen_random_uuid(),
  medicine_id    uuid not null references medicines (id) on delete cascade,
  pharmacy       text not null check (pharmacy in ('1mg','pharmeasy','apollo','netmeds','medplus')),
  price          numeric(10, 2),
  price_per_unit numeric(10, 4),
  url            text,
  in_stock       boolean not null default true,
  scraped_at     timestamptz not null default now()
);

create index if not exists prices_medicine_id_idx on prices (medicine_id);
create index if not exists prices_scraped_at_idx  on prices (scraped_at desc);
create unique index if not exists prices_medicine_pharmacy_idx on prices (medicine_id, pharmacy);

-- ─── generics ─────────────────────────────────────────────────────────────────
create table if not exists generics (
  id                   uuid primary key default gen_random_uuid(),
  salt_name            text not null unique,
  jan_aushadhi_name    text,
  jan_aushadhi_mrp     numeric(10, 2),
  jan_aushadhi_code    text,
  who_essential        boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists generics_salt_name_idx on generics (salt_name);

-- ─── jan_aushadhi_stores ──────────────────────────────────────────────────────
create table if not exists jan_aushadhi_stores (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  address   text,
  pincode   text not null,
  city      text,
  state     text,
  lat       numeric(10, 6),
  lng       numeric(10, 6),
  phone     text,
  created_at timestamptz not null default now()
);

create index if not exists stores_pincode_idx on jan_aushadhi_stores (pincode);
create index if not exists stores_state_idx   on jan_aushadhi_stores (state);

-- ─── search_logs ──────────────────────────────────────────────────────────────
create table if not exists search_logs (
  id          uuid primary key default gen_random_uuid(),
  query       text not null,
  matched     boolean not null default false,
  medicine_id uuid references medicines (id) on delete set null,
  searched_at timestamptz not null default now()
);

create index if not exists search_logs_query_idx on search_logs (query);
create index if not exists search_logs_at_idx    on search_logs (searched_at desc);

-- ─── auto-update updated_at on medicines ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger medicines_updated_at
  before update on medicines
  for each row execute function update_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table medicines          enable row level security;
alter table prices             enable row level security;
alter table generics           enable row level security;
alter table jan_aushadhi_stores enable row level security;
alter table search_logs        enable row level security;

-- Public read on medicines, generics, prices, stores
create policy "public read medicines"   on medicines           for select using (true);
create policy "public read prices"      on prices              for select using (true);
create policy "public read generics"    on generics            for select using (true);
create policy "public read stores"      on jan_aushadhi_stores for select using (true);

-- Service role only writes (ingestion scripts use service role key)
create policy "service write medicines" on medicines           for all using (auth.role() = 'service_role');
create policy "service write prices"    on prices              for all using (auth.role() = 'service_role');
create policy "service write generics"  on generics            for all using (auth.role() = 'service_role');
create policy "service write stores"    on jan_aushadhi_stores for all using (auth.role() = 'service_role');
create policy "service write logs"      on search_logs         for all using (auth.role() = 'service_role');
-- Allow anon to insert search logs (front-end logging)
create policy "anon insert logs"        on search_logs         for insert with check (true);
