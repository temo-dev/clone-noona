-- 0007_business_hours.sql
-- One row per weekday (0=Sun … 6=Sat) per business

CREATE TABLE business_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  weekday     int  NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  time,
  end_time    time,
  is_closed   boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_business_weekday    UNIQUE (business_id, weekday),
  CONSTRAINT chk_biz_hours_order    CHECK (is_closed = true OR end_time > start_time)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_hours_select" ON business_hours
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Public can read business hours (needed for booking page availability)
CREATE POLICY "business_hours_select_public" ON business_hours
  FOR SELECT USING (true);

CREATE POLICY "business_hours_upsert_owner_manager" ON business_hours
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
