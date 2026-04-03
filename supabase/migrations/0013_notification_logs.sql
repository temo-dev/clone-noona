-- 0013_notification_logs.sql

CREATE TABLE notification_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES bookings(id) ON DELETE SET NULL,
  type        text NOT NULL
    CHECK (type IN ('booking_created', 'booking_confirmed', 'booking_cancelled', 'reminder')),
  channel     text NOT NULL DEFAULT 'email',
  sent_to     text,
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Idempotency: only one log per booking per notification type
  CONSTRAINT uq_notification_booking_type UNIQUE (booking_id, type)
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs_select" ON notification_logs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'manager')
    )
  );
