-- Brand aliases: maps common brand names to their generic salt + NPPA medicine entry.
-- Enables searching "Dolo", "Crocin", "Augmentin" and finding the right medicine.

create table if not exists brand_aliases (
  id           uuid primary key default gen_random_uuid(),
  brand_name   text not null,
  salt_name    text not null,
  manufacturer text,
  medicine_id  uuid references medicines (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists brand_aliases_brand_name_idx on brand_aliases (brand_name);
create index if not exists brand_aliases_salt_name_idx  on brand_aliases (salt_name);
create index if not exists brand_aliases_medicine_id_idx on brand_aliases (medicine_id);
create unique index if not exists brand_aliases_brand_salt_idx on brand_aliases (brand_name, salt_name);

-- Full-text search on brand names
create index if not exists brand_aliases_fts_idx on brand_aliases
  using gin (to_tsvector('english', brand_name));

alter table brand_aliases enable row level security;
create policy "public read brand_aliases"   on brand_aliases for select using (true);
create policy "service write brand_aliases" on brand_aliases for all using (auth.role() = 'service_role');
