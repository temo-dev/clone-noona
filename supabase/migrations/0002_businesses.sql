-- 0002_businesses.sql

CREATE TABLE businesses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL REFERENCES auth.users(id),
  name         text        NOT NULL,
  slug         text        NOT NULL,
  timezone     text        NOT NULL DEFAULT 'UTC',
  description  text,
  address      text,
  phone        text,
  logo_url     text,
  is_active    boolean     NOT NULL DEFAULT true,
  suspended_at timestamptz,
  plan         text        NOT NULL DEFAULT 'free',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_slug UNIQUE (slug),
  CONSTRAINT chk_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- businesses_select references business_members — defined in 0003_business_members.sql

-- Only owner can update
CREATE POLICY "businesses_update_owner" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Owner inserts via server action (validated in app layer)
CREATE POLICY "businesses_insert" ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());
