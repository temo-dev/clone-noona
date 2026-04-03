-- 0016_booking_rpcs.sql
-- Atomic booking mutations. All functions use SECURITY DEFINER + fixed search_path.
-- p_staff_id is always required — callers must resolve a concrete staff_id before calling.

-- ─── create_booking ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_booking(
  p_business_id uuid,
  p_service_id  uuid,
  p_staff_id    uuid,
  p_customer_id uuid,
  p_start_at    timestamptz,
  p_timezone    text,
  p_source      text,
  p_notes       text DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
  v_service   services%ROWTYPE;
  v_staff     staff%ROWTYPE;
  v_biz_hrs   business_hours%ROWTYPE;
  v_staff_hrs staff_working_hours%ROWTYPE;
  v_weekday   int;
  v_t_start   time;
  v_t_end     time;
  v_eff_start timestamptz;
  v_eff_end   timestamptz;
  v_booking   bookings%ROWTYPE;
BEGIN
  -- Guard: p_staff_id must not be null
  IF p_staff_id IS NULL THEN
    RAISE EXCEPTION 'staff_id_required';
  END IF;

  -- 1. Business active
  IF NOT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND is_active = true
  ) THEN RAISE EXCEPTION 'business_not_active'; END IF;

  -- 2. Service active + belongs to business
  SELECT * INTO v_service FROM services
  WHERE id = p_service_id AND business_id = p_business_id AND is_active = true
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_not_found'; END IF;

  -- 3. Staff active + belongs to business
  SELECT * INTO v_staff FROM staff
  WHERE id = p_staff_id AND business_id = p_business_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found'; END IF;

  -- 4. Staff can perform service
  IF NOT EXISTS (
    SELECT 1 FROM staff_services
    WHERE staff_id = p_staff_id AND service_id = p_service_id
  ) THEN RAISE EXCEPTION 'staff_cannot_perform_service'; END IF;

  -- 5. Customer belongs to business
  IF NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_customer_id AND business_id = p_business_id
  ) THEN RAISE EXCEPTION 'customer_not_found'; END IF;

  -- 6. Compute effective range
  v_eff_start := p_start_at - (v_service.buffer_before_minutes * interval '1 minute');
  v_eff_end   := p_start_at
    + (v_service.duration_minutes     * interval '1 minute')
    + (v_service.buffer_after_minutes * interval '1 minute');

  -- 7. Business hours check (MVP: no overnight hours — end_time > start_time enforced by constraint)
  v_weekday := EXTRACT(DOW FROM p_start_at AT TIME ZONE p_timezone)::int;
  v_t_start := (p_start_at  AT TIME ZONE p_timezone)::time;
  v_t_end   := (v_eff_end   AT TIME ZONE p_timezone)::time;

  SELECT * INTO v_biz_hrs FROM business_hours
  WHERE business_id = p_business_id AND weekday = v_weekday;
  IF NOT FOUND OR v_biz_hrs.is_closed THEN
    RAISE EXCEPTION 'business_closed';
  END IF;
  IF v_t_start < v_biz_hrs.start_time OR v_t_end > v_biz_hrs.end_time THEN
    RAISE EXCEPTION 'outside_business_hours';
  END IF;

  -- 8. Staff working hours check
  SELECT * INTO v_staff_hrs FROM staff_working_hours
  WHERE staff_id = p_staff_id AND weekday = v_weekday;
  IF NOT FOUND OR v_staff_hrs.is_off THEN
    RAISE EXCEPTION 'staff_not_working';
  END IF;
  IF v_t_start < v_staff_hrs.start_time OR v_t_end > v_staff_hrs.end_time THEN
    RAISE EXCEPTION 'outside_staff_hours';
  END IF;

  -- 9. Staff time-off check (strict overlap)
  IF EXISTS (
    SELECT 1 FROM staff_time_off
    WHERE staff_id = p_staff_id
      AND start_at < v_eff_end
      AND end_at   > v_eff_start
  ) THEN RAISE EXCEPTION 'staff_on_time_off'; END IF;

  -- 10. Advisory lock on (staff, UTC day) + overlap check on effective range
  PERFORM pg_advisory_xact_lock(
    hashtext(p_staff_id::text || date_trunc('day', p_start_at)::text)
  );
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE staff_id   = p_staff_id
      AND status    <> 'cancelled'
      AND effective_start_at < v_eff_end
      AND effective_end_at   > v_eff_start
  ) THEN RAISE EXCEPTION 'slot_not_available'; END IF;

  -- 11. Insert with snapshots
  INSERT INTO bookings (
    business_id, service_id, staff_id, customer_id,
    status, start_at, end_at, effective_start_at, effective_end_at,
    timezone, source, notes,
    service_name_snapshot, service_duration_minutes_snapshot,
    buffer_before_snapshot, buffer_after_snapshot,
    price_snapshot, staff_name_snapshot
  ) VALUES (
    p_business_id, p_service_id, p_staff_id, p_customer_id,
    'pending',
    p_start_at,
    p_start_at + (v_service.duration_minutes * interval '1 minute'),
    v_eff_start, v_eff_end,
    p_timezone, p_source, p_notes,
    v_service.name, v_service.duration_minutes,
    v_service.buffer_before_minutes, v_service.buffer_after_minutes,
    v_service.price,
    v_staff.display_name
  ) RETURNING * INTO v_booking;

  INSERT INTO booking_audit_logs (booking_id, action, actor_type, payload)
  VALUES (v_booking.id, 'created', p_source, row_to_json(v_booking)::jsonb);

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION create_booking(uuid,uuid,uuid,uuid,timestamptz,text,text,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_booking(uuid,uuid,uuid,uuid,timestamptz,text,text,text) TO authenticated;


-- ─── _internal_cancel_booking (helper — not callable directly) ───────────────
CREATE OR REPLACE FUNCTION _internal_cancel_booking(
  p_booking_id uuid,
  p_actor_type text,
  p_actor_id   text,
  p_reason     text DEFAULT NULL
) RETURNS bookings AS $$
DECLARE v_booking bookings%ROWTYPE; BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'booking_cannot_be_cancelled';
  END IF;

  UPDATE bookings
  SET status = 'cancelled', cancel_reason = p_reason, updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  INSERT INTO booking_audit_logs (booking_id, action, actor_type, actor_id, payload)
  VALUES (p_booking_id, 'cancelled', p_actor_type, p_actor_id,
          jsonb_build_object('reason', p_reason));

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION _internal_cancel_booking(uuid,text,text,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION _internal_cancel_booking(uuid,text,text,text) TO service_role;


-- ─── cancel_booking_by_token (customer self-service via magic link) ───────────
CREATE OR REPLACE FUNCTION cancel_booking_by_token(
  p_token  text,
  p_reason text DEFAULT NULL
) RETURNS bookings AS $$
DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM bookings WHERE booking_access_token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  RETURN _internal_cancel_booking(v_id, 'customer', p_token, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION cancel_booking_by_token(text,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cancel_booking_by_token(text,text) TO anon;


-- ─── cancel_booking_by_member (staff/owner via dashboard) ────────────────────
CREATE OR REPLACE FUNCTION cancel_booking_by_member(
  p_booking_id uuid,
  p_reason     text DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_role    text;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;

  SELECT role INTO v_role FROM business_members
  WHERE business_id = v_booking.business_id AND user_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Staff can only cancel their own bookings
  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1 FROM staff
    WHERE id = v_booking.staff_id AND profile_user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'unauthorized'; END IF;

  RETURN _internal_cancel_booking(p_booking_id, v_role, auth.uid()::text, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION cancel_booking_by_member(uuid,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cancel_booking_by_member(uuid,text) TO authenticated;


-- ─── reschedule_booking_by_token ─────────────────────────────────────────────
-- Returns the NEW booking. Old booking is cancelled. New token must be sent to customer.
CREATE OR REPLACE FUNCTION reschedule_booking_by_token(
  p_token        text,
  p_new_start_at timestamptz
) RETURNS bookings AS $$
DECLARE
  v_old bookings%ROWTYPE;
  v_new bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM bookings WHERE booking_access_token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_old.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'booking_cannot_be_rescheduled';
  END IF;

  -- Create new booking (inherits all attributes, new slot)
  SELECT * INTO v_new FROM create_booking(
    v_old.business_id, v_old.service_id, v_old.staff_id,
    v_old.customer_id, p_new_start_at, v_old.timezone, 'public', v_old.notes
  );

  PERFORM _internal_cancel_booking(v_old.id, 'customer', p_token, 'rescheduled');

  INSERT INTO booking_audit_logs (booking_id, action, actor_type, actor_id, payload)
  VALUES (v_new.id, 'rescheduled_from', 'customer', p_token,
          jsonb_build_object('old_booking_id', v_old.id));

  -- Caller (server action) is responsible for sending email with v_new.booking_access_token
  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION reschedule_booking_by_token(text,timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION reschedule_booking_by_token(text,timestamptz) TO anon;


-- ─── reschedule_booking_by_member ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reschedule_booking_by_member(
  p_booking_id   uuid,
  p_new_start_at timestamptz
) RETURNS bookings AS $$
DECLARE
  v_old  bookings%ROWTYPE;
  v_new  bookings%ROWTYPE;
  v_role text;
BEGIN
  SELECT * INTO v_old FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_old.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'booking_cannot_be_rescheduled';
  END IF;

  SELECT role INTO v_role FROM business_members
  WHERE business_id = v_old.business_id AND user_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Staff can only reschedule their own bookings
  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1 FROM staff
    WHERE id = v_old.staff_id AND profile_user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO v_new FROM create_booking(
    v_old.business_id, v_old.service_id, v_old.staff_id,
    v_old.customer_id, p_new_start_at, v_old.timezone, 'admin', v_old.notes
  );

  PERFORM _internal_cancel_booking(v_old.id, v_role, auth.uid()::text, 'rescheduled');

  INSERT INTO booking_audit_logs (booking_id, action, actor_type, actor_id, payload)
  VALUES (v_new.id, 'rescheduled_from', v_role, auth.uid()::text,
          jsonb_build_object('old_booking_id', v_old.id));

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION reschedule_booking_by_member(uuid,timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION reschedule_booking_by_member(uuid,timestamptz) TO authenticated;
