create table if not exists scrape_queue (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  slug text not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed'))
);

create index if not exists scrape_queue_status_idx on scrape_queue(status, requested_at);
create unique index if not exists scrape_queue_pending_idx on scrape_queue(medicine_id) where status = 'pending';
