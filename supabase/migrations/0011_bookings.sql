-- 0011_bookings.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE bookings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES services(id),
  staff_id    uuid NOT NULL REFERENCES staff(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

  -- Raw service time (no buffers)
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,

  -- Effective blocked range including buffers — stored to avoid re-joining services on overlap check
  effective_start_at timestamptz NOT NULL,
  effective_end_at   timestamptz NOT NULL,

  timezone      text NOT NULL,
  source        text NOT NULL DEFAULT 'public' CHECK (source IN ('public', 'admin')),
  notes         text,
  cancel_reason text,
  booking_access_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),

  -- Snapshots: protect historical data when service/staff is later modified or archived
  service_name_snapshot             text    NOT NULL,
  service_duration_minutes_snapshot int     NOT NULL,
  buffer_before_snapshot            int     NOT NULL DEFAULT 0,
  buffer_after_snapshot             int     NOT NULL DEFAULT 0,
  price_snapshot                    numeric,
  staff_name_snapshot               text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_booking_time_order       CHECK (end_at > start_at),
  CONSTRAINT chk_effective_time_order     CHECK (effective_end_at > effective_start_at),
  CONSTRAINT chk_effective_wraps_booking  CHECK (effective_start_at <= start_at AND effective_end_at >= end_at)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Owner/manager: see all bookings for their business
-- Staff: see only their own bookings
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_id = bookings.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND (
          bm.role IN ('owner', 'manager')
          OR (
            bm.role = 'staff'
            AND bookings.staff_id IN (
              SELECT id FROM staff WHERE profile_user_id = auth.uid()
            )
          )
        )
    )
  );

-- Inserts always go through server actions (RPC)
CREATE POLICY "bookings_insert_authenticated" ON bookings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Updates go through server actions
CREATE POLICY "bookings_update_authenticated" ON bookings
  FOR UPDATE USING (auth.role() = 'authenticated');
