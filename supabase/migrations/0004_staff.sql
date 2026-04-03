-- 0004_staff.sql

CREATE TABLE staff (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  profile_user_id uuid        REFERENCES auth.users(id),
  display_name    text        NOT NULL,
  email           text,
  phone           text,
  color_code      text        NOT NULL DEFAULT '#6366f1',
  bio             text,
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select" ON staff
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "staff_insert_owner_manager" ON staff
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "staff_update_owner_manager" ON staff
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
