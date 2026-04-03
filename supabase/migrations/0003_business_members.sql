-- 0003_business_members.sql

CREATE TABLE business_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'manager', 'staff')),
  status      text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'removed')),
  invited_at  timestamptz,
  joined_at   timestamptz,
  CONSTRAINT uq_business_members UNIQUE (business_id, user_id)
);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON business_members
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members bm2
      WHERE bm2.user_id = auth.uid() AND bm2.status = 'active'
    )
  );

CREATE POLICY "members_insert_owner" ON business_members
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "members_update_owner" ON business_members
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Now that business_members exists, add the businesses_select policy
CREATE POLICY "businesses_select" ON businesses
  FOR SELECT USING (
    id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
