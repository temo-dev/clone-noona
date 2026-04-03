-- 0018_fix_rls_recursion.sql
--
-- Fix: infinite recursion in RLS policies between businesses and business_members.
--
-- Root cause:
--   businesses_select  → queries business_members (triggers members_select)
--   members_select     → self-references business_members (triggers members_select again)
--   → 42P17 infinite recursion
--
-- Fix: introduce a SECURITY DEFINER helper that reads business_members WITHOUT RLS,
-- breaking the circular dependency.

-- ── Helper function ───────────────────────────────────────────────────────────
-- Reads business_ids for the current user bypassing RLS (SECURITY DEFINER).
-- Result is stable within a transaction — mark STABLE so the planner can cache it.
CREATE OR REPLACE FUNCTION get_auth_business_ids()
RETURNS SETOF uuid AS $$
  SELECT business_id
  FROM business_members
  WHERE user_id = auth.uid() AND status = 'active'
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ── businesses: fix SELECT policy ────────────────────────────────────────────
-- Old policy referenced business_members through the normal RLS path → recursion.
-- New policy: owner_id direct check (works during onboarding before membership exists)
--             OR SECURITY DEFINER function (no recursion).
DROP POLICY IF EXISTS "businesses_select" ON businesses;
CREATE POLICY "businesses_select" ON businesses
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT get_auth_business_ids())
  );

-- ── business_members: fix SELECT policy ──────────────────────────────────────
-- Old policy: self-referential subquery on business_members → recursion.
-- New policy: uses SECURITY DEFINER function instead.
DROP POLICY IF EXISTS "members_select" ON business_members;
CREATE POLICY "members_select" ON business_members
  FOR SELECT USING (
    business_id IN (SELECT get_auth_business_ids())
  );

-- ── business_members: INSERT / UPDATE policies ────────────────────────────────
-- These queried `businesses WHERE owner_id = auth.uid()`.
-- After the fix, businesses_select uses owner_id direct check (no recursion),
-- so these policies remain safe. Re-create for clarity.
DROP POLICY IF EXISTS "members_insert_owner" ON business_members;
CREATE POLICY "members_insert_owner" ON business_members
  FOR INSERT WITH CHECK (
    -- Allow if the current user owns the target business
    -- (owner_id check in businesses_select prevents recursion here)
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members_update_owner" ON business_members;
CREATE POLICY "members_update_owner" ON business_members
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
