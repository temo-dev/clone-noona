-- 0012_booking_audit_logs.sql

CREATE TABLE booking_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action      text NOT NULL,   -- 'created' | 'confirmed' | 'cancelled' | 'rescheduled_from' | ...
  actor_type  text NOT NULL,   -- 'public' | 'admin' | 'owner' | 'manager' | 'staff' | 'customer'
  actor_id    text,            -- user_id or booking_access_token
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON booking_audit_logs
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings b
      WHERE EXISTS (
        SELECT 1 FROM business_members bm
        WHERE bm.business_id = b.business_id
          AND bm.user_id = auth.uid()
          AND bm.status = 'active'
          AND bm.role IN ('owner', 'manager')
      )
    )
  );
