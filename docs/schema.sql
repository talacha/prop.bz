-- PostgreSQL 16 schema for ATM Direct Booking
-- Core guarantee: the database itself prevents double-booking (exclusion constraint),
-- independent of application bugs or race conditions.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('guest','host','staff','admin');
CREATE TYPE booking_status AS ENUM ('requested','pending_payment','confirmed','checked_in','completed',
                                    'cancelled_by_guest','cancelled_by_host','declined','expired');
CREATE TYPE currency AS ENUM ('MXN','USD');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  email_verified_at timestamptz,
  name          text,
  phone         text,
  locale        text NOT NULL DEFAULT 'es-MX',
  roles         user_role[] NOT NULL DEFAULT '{guest}',
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  family_id   uuid NOT NULL,                    -- reuse of a rotated token revokes the family
  token_hash  bytea NOT NULL UNIQUE,            -- SHA-256, never the raw token
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  user_agent  text, ip inet
);

CREATE TABLE hosts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES users,
  legal_name      text NOT NULL,
  rfc             text,                          -- Mexican tax id, needed for CFDI invoices
  stripe_account_id text UNIQUE,   -- NULL while the entity charges on the platform's own Stripe account (MVP)
  tax_regime text, fiscal_postal_code text,
  payouts_enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE host_members (host_id uuid REFERENCES hosts, user_id uuid REFERENCES users, role text NOT NULL, PRIMARY KEY (host_id, user_id));

CREATE TABLE properties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id      uuid NOT NULL REFERENCES hosts,
  slug         text UNIQUE NOT NULL,
  title        jsonb NOT NULL,                   -- {"es":"…","en":"…"}
  description  jsonb NOT NULL,
  listing_types text[] NOT NULL DEFAULT '{short_term}',
  timezone     text NOT NULL DEFAULT 'America/Cancun',
  location     geography(Point,4326) NOT NULL,   -- exact; API only exposes a fuzzed point until booking is confirmed
  address      jsonb NOT NULL,                   -- encrypted at app layer before confirmed-booking release
  max_guests   int NOT NULL CHECK (max_guests > 0),
  bedrooms     int NOT NULL, beds int NOT NULL, bathrooms numeric(3,1) NOT NULL,
  bed_types    jsonb NOT NULL DEFAULT '{}',      -- {"king":2,"queen":1}
  instant_book boolean NOT NULL DEFAULT false,
  rules        jsonb NOT NULL DEFAULT '{}',      -- min/max stay, notice, prep days, check-in window, house rules
  cancellation_policy jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  rating_avg   numeric(3,2), rating_count int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_loc_gix ON properties USING gist (location);

-- Normalises the ~20 legacy amenity fields (jacuzzi, gym, pool: shared, parking: 1 …)
CREATE TABLE amenities (code text PRIMARY KEY, category text NOT NULL, label jsonb NOT NULL, value_kind text NOT NULL DEFAULT 'bool');
CREATE TABLE property_amenities (property_id uuid REFERENCES properties ON DELETE CASCADE, code text REFERENCES amenities, value jsonb, PRIMARY KEY (property_id, code));

CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  object_key text NOT NULL, alt jsonb, blurhash text, width int, height int, position int NOT NULL
);

CREATE TABLE pricing_rules (
  property_id uuid PRIMARY KEY REFERENCES properties ON DELETE CASCADE,
  currency currency NOT NULL,
  base_nightly int NOT NULL CHECK (base_nightly >= 0),
  weekend_nightly int, cleaning_fee int NOT NULL DEFAULT 0,
  extra_guest_fee int NOT NULL DEFAULT 0, extra_guest_after int,
  weekly_discount_pct numeric(4,1) NOT NULL DEFAULT 0, monthly_discount_pct numeric(4,1) NOT NULL DEFAULT 0,
  payment_schedule text NOT NULL DEFAULT 'full_upfront'
);
CREATE TABLE seasonal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  during daterange NOT NULL, nightly int NOT NULL, min_stay int,
  EXCLUDE USING gist (property_id WITH =, during WITH &&)
);
CREATE TABLE price_overrides (
  property_id uuid REFERENCES properties ON DELETE CASCADE, day date, nightly int NOT NULL, PRIMARY KEY (property_id, day)
);

CREATE TABLE tax_rates (
  id serial PRIMARY KEY, jurisdiction text NOT NULL, code text NOT NULL,       -- 'MX-IVA', 'MX-ROO-ISH'
  rate_bp int NOT NULL, applies_to text NOT NULL, valid_during daterange NOT NULL  -- configurable; confirm rates with an accountant
);

CREATE TABLE guests (   -- snapshot of guest contact data per booking (guest may not have an account)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users,
  name text NOT NULL, email citext NOT NULL, phone text NOT NULL, country text
);

CREATE TABLE bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text UNIQUE NOT NULL,
  property_id    uuid NOT NULL REFERENCES properties,
  guest_id       uuid NOT NULL REFERENCES guests,
  status         booking_status NOT NULL,
  stay           daterange NOT NULL CHECK (NOT isempty(stay) AND upper(stay) - lower(stay) >= 1),
  adults int NOT NULL, children int NOT NULL DEFAULT 0, pets int NOT NULL DEFAULT 0,
  currency       currency NOT NULL,
  quote_snapshot jsonb NOT NULL,                 -- immutable: lines, taxes, policy as shown to the guest
  total_amount   int NOT NULL, amount_paid int NOT NULL DEFAULT 0,
  hold_expires_at timestamptz,
  source         text NOT NULL DEFAULT 'direct', -- direct | manual (staff-entered offline booking)
  created_at     timestamptz NOT NULL DEFAULT now(),
  version        int NOT NULL DEFAULT 0,         -- optimistic locking
  -- THE anti-double-booking guarantee: no two active bookings overlap for a property
  CONSTRAINT no_double_booking EXCLUDE USING gist (property_id WITH =, stay WITH &&)
    WHERE (status IN ('requested','pending_payment','confirmed','checked_in'))
);
CREATE INDEX bookings_guest_idx ON bookings (guest_id);
CREATE INDEX bookings_hold_idx ON bookings (hold_expires_at) WHERE status = 'pending_payment';

CREATE TABLE calendar_blocks (   -- owner blocks (maintenance, personal use); no third-party feeds
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties ON DELETE CASCADE,
  during daterange NOT NULL, source text NOT NULL, external_uid text, reason text,
  UNIQUE (property_id, source, external_uid)
);
CREATE INDEX calendar_blocks_gist ON calendar_blocks USING gist (property_id, during);

CREATE TABLE ical_export_tokens (property_id uuid PRIMARY KEY REFERENCES properties, token_hash bytea NOT NULL UNIQUE);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings,
  stripe_payment_intent text UNIQUE, kind text NOT NULL CHECK (kind IN ('charge','deposit','balance','refund')),
  amount int NOT NULL, currency currency NOT NULL, status text NOT NULL,
  platform_fee int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payouts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), host_id uuid NOT NULL REFERENCES hosts, stripe_payout_id text UNIQUE, amount int, currency currency, paid_at timestamptz);

CREATE TABLE guest_fiscal_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guest_id uuid NOT NULL REFERENCES guests, rfc text NOT NULL, legal_name text NOT NULL, tax_regime text NOT NULL, postal_code text NOT NULL, cfdi_use text NOT NULL);
CREATE TABLE invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings, cfdi_uuid text UNIQUE, xml_key text, pdf_key text, status text NOT NULL DEFAULT 'pending', created_at timestamptz DEFAULT now());

CREATE TABLE threads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid REFERENCES bookings, property_id uuid NOT NULL REFERENCES properties, guest_user_id uuid REFERENCES users);
CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), thread_id uuid NOT NULL REFERENCES threads, sender_id uuid NOT NULL REFERENCES users, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid UNIQUE NOT NULL REFERENCES bookings,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5), categories jsonb, comment text,
  host_response text, published_at timestamptz   -- published when both sides submit or window closes
);
CREATE TABLE inquiries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid REFERENCES properties, name text, email citext, message text, created_at timestamptz DEFAULT now());

-- Reliability plumbing
CREATE TABLE outbox_events (id bigserial PRIMARY KEY, aggregate text, aggregate_id uuid, type text NOT NULL, payload jsonb NOT NULL, created_at timestamptz DEFAULT now(), published_at timestamptz);
CREATE TABLE idempotency_keys (key uuid, user_scope text, request_hash bytea NOT NULL, response jsonb, status_code int, created_at timestamptz DEFAULT now(), PRIMARY KEY (key, user_scope));
CREATE TABLE stripe_events (id text PRIMARY KEY, type text, received_at timestamptz DEFAULT now(), processed_at timestamptz);
CREATE TABLE webhook_endpoints (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), host_id uuid REFERENCES hosts, url text NOT NULL, secret_enc bytea NOT NULL, events text[] NOT NULL);
CREATE TABLE audit_log (id bigserial PRIMARY KEY, actor_id uuid, action text NOT NULL, object_type text, object_id uuid, ip inet, meta jsonb, at timestamptz DEFAULT now());

-- Row-level security as defense in depth: hosts see only their own properties' rows
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY host_bookings ON bookings USING (property_id IN (SELECT id FROM properties WHERE host_id = current_setting('app.host_id')::uuid));
