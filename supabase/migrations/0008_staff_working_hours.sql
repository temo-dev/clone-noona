-- 0008_staff_working_hours.sql
-- One row per weekday per staff member

CREATE TABLE staff_working_hours (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid    NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    uuid    NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  weekday     int     NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  time,
  end_time    time,
  is_off      boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_staff_weekday   UNIQUE (staff_id, weekday),
  CONSTRAINT chk_hours_order    CHECK (is_off = true OR end_time > start_time)
);

ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_working_hours_select" ON staff_working_hours
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "staff_working_hours_upsert_owner_manager" ON staff_working_hours
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
