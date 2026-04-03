-- 0005_services.sql

CREATE TABLE services (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid    NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                  text    NOT NULL,
  description           text,
  duration_minutes      int     NOT NULL,
  price                 numeric,
  buffer_before_minutes int     NOT NULL DEFAULT 0,
  buffer_after_minutes  int     NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT chk_buffers_nonneg    CHECK (buffer_before_minutes >= 0 AND buffer_after_minutes >= 0)
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON services
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Public: anyone can read active services by business_id (for booking page)
CREATE POLICY "services_select_public" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "services_insert_owner_manager" ON services
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "services_update_owner_manager" ON services
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
