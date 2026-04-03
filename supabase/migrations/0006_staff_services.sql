-- 0006_staff_services.sql
-- Maps which staff can perform which services

CREATE TABLE staff_services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_services UNIQUE (business_id, staff_id, service_id)
);

ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_services_select" ON staff_services
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "staff_services_insert_owner_manager" ON staff_services
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "staff_services_delete_owner_manager" ON staff_services
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
