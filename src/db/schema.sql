-- MedCompare Database Schema
-- Run this in your Supabase SQL editor

-- Medicines master table
CREATE TABLE IF NOT EXISTS medicines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name    TEXT NOT NULL,
  salt_name     TEXT NOT NULL,
  manufacturer  TEXT,
  category      TEXT,
  form          TEXT,
  strength      TEXT,
  pack_size     TEXT,
  nppa_ceiling  DECIMAL(10,2),
  slug          TEXT UNIQUE NOT NULL,
  has_generic   BOOLEAN DEFAULT FALSE,
  source        TEXT NOT NULL DEFAULT 'manual',
  source_file   TEXT,
  source_row_hash TEXT,
  source_updated_at TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', brand_name || ' ' || salt_name)
  ) STORED,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medicines ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS source_row_hash TEXT;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_medicines_brand        ON medicines USING btree (brand_name);
CREATE INDEX IF NOT EXISTS idx_medicines_salt         ON medicines USING btree (salt_name);
CREATE INDEX IF NOT EXISTS idx_medicines_slug         ON medicines USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_medicines_search       ON medicines USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_medicines_source       ON medicines USING btree (source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicines_source_hash ON medicines (source, source_row_hash) WHERE source_row_hash IS NOT NULL;

-- Pharmacy prices (scraped)
CREATE TABLE IF NOT EXISTS prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id   UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  pharmacy      TEXT NOT NULL CHECK (pharmacy IN ('1mg', 'pharmeasy', 'apollo', 'netmeds', 'medplus')),
  price         DECIMAL(10,2),
  price_per_unit DECIMAL(10,4),
  url           TEXT,
  in_stock      BOOLEAN DEFAULT TRUE,
  scraped_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(medicine_id, pharmacy)
);

CREATE INDEX IF NOT EXISTS idx_prices_medicine    ON prices (medicine_id);
CREATE INDEX IF NOT EXISTS idx_prices_scraped     ON prices (scraped_at DESC);

-- Generic (Jan Aushadhi) drug catalog
CREATE TABLE IF NOT EXISTS generics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salt_name          TEXT UNIQUE NOT NULL,
  jan_aushadhi_name  TEXT,
  jan_aushadhi_mrp   DECIMAL(10,2),
  jan_aushadhi_code  TEXT,
  who_essential      BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generics_salt ON generics (salt_name);

-- Jan Aushadhi store locations
CREATE TABLE IF NOT EXISTS jan_aushadhi_stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  pincode     TEXT NOT NULL,
  city        TEXT,
  state       TEXT,
  lat         DECIMAL(10, 6),
  lng         DECIMAL(10, 6),
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_pincode ON jan_aushadhi_stores (pincode);
CREATE INDEX IF NOT EXISTS idx_stores_city    ON jan_aushadhi_stores (city);
CREATE INDEX IF NOT EXISTS idx_stores_state   ON jan_aushadhi_stores (state);

-- Price alerts (user subscriptions)
CREATE TABLE IF NOT EXISTS price_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  medicine_id   UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  pharmacy      TEXT,
  target_price  DECIMAL(10,2) NOT NULL,
  triggered     BOOLEAN DEFAULT FALSE,
  triggered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_email      ON price_alerts (email);
CREATE INDEX IF NOT EXISTS idx_alerts_medicine   ON price_alerts (medicine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered  ON price_alerts (triggered);

-- Search logs (for analytics + improving coverage)
CREATE TABLE IF NOT EXISTS search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query         TEXT NOT NULL,
  matched       BOOLEAN DEFAULT FALSE,
  medicine_id   UUID REFERENCES medicines(id),
  searched_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query  ON search_logs (query);
CREATE INDEX IF NOT EXISTS idx_search_logs_time   ON search_logs (searched_at DESC);

-- View: medicines with their cheapest current price
CREATE OR REPLACE VIEW medicine_price_summary AS
SELECT
  m.id,
  m.brand_name,
  m.salt_name,
  m.slug,
  m.has_generic,
  m.nppa_ceiling,
  g.jan_aushadhi_mrp,
  MIN(p.price) AS cheapest_online_price,
  COUNT(p.id) AS pharmacy_count,
  MAX(p.scraped_at) AS last_scraped
FROM medicines m
LEFT JOIN prices p ON p.medicine_id = m.id AND p.in_stock = TRUE
LEFT JOIN generics g ON g.salt_name = m.salt_name
GROUP BY m.id, g.jan_aushadhi_mrp;
