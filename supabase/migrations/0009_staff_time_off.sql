-- 0009_staff_time_off.sql

CREATE TABLE staff_time_off (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_timeoff_order CHECK (end_at > start_at)
);

ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_time_off_select" ON staff_time_off
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "staff_time_off_insert_owner_manager" ON staff_time_off
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "staff_time_off_delete_owner_manager" ON staff_time_off
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
