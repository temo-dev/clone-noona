-- 0019_update_staff_services_rpc.sql
--
-- Atomic staff-service assignment update.
-- Replaces the non-atomic DELETE + INSERT pattern in the app layer.

CREATE OR REPLACE FUNCTION update_staff_services(
  p_business_id uuid,
  p_staff_id    uuid,
  p_service_ids uuid[]
) RETURNS void AS $$
BEGIN
  -- Verify staff belongs to business (safety net — app layer also checks)
  IF NOT EXISTS (
    SELECT 1 FROM staff
    WHERE id = p_staff_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'staff_not_found';
  END IF;

  -- Delete assignments not in the new list
  DELETE FROM staff_services
  WHERE staff_id = p_staff_id
    AND (
      cardinality(p_service_ids) = 0          -- empty list → remove all
      OR service_id <> ALL(p_service_ids)     -- not in new list
    );

  -- Insert new assignments (skip existing via ON CONFLICT DO NOTHING)
  IF cardinality(p_service_ids) > 0 THEN
    INSERT INTO staff_services (business_id, staff_id, service_id)
    SELECT p_business_id, p_staff_id, unnest(p_service_ids)
    ON CONFLICT (business_id, staff_id, service_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION update_staff_services(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_staff_services(uuid, uuid, uuid[]) TO authenticated;
