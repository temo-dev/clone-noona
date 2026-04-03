-- 0015_indexes_constraints.sql

-- ── Performance indexes ───────────────────────────────────────────────────────

-- Booking overlap check hot path — uses effective range (no join to services needed)
CREATE INDEX idx_bookings_staff_eff
  ON bookings (staff_id, effective_start_at, effective_end_at)
  WHERE status <> 'cancelled';

-- Calendar dashboard: bookings by business + date
CREATE INDEX idx_bookings_business_day
  ON bookings (business_id, start_at)
  WHERE status <> 'cancelled';

-- Public page business lookup by slug
CREATE INDEX idx_businesses_slug ON businesses (slug);

-- Reminder cron: find bookings needing reminders
CREATE INDEX idx_bookings_reminder
  ON bookings (start_at)
  WHERE status = 'confirmed';

-- Notification idempotency lookup
CREATE INDEX idx_notif_booking_type ON notification_logs (booking_id, type);

-- Staff lookup by profile user (for RLS)
CREATE INDEX idx_staff_profile_user ON staff (profile_user_id) WHERE profile_user_id IS NOT NULL;

-- Business members lookup (used in every RLS policy)
CREATE INDEX idx_biz_members_user ON business_members (user_id, business_id) WHERE status = 'active';
