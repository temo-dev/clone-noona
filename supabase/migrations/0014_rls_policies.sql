-- 0014_rls_policies.sql
-- Additional cross-table policies and public-access grants for the booking page

-- Public (anon) can read active businesses by slug — needed for /b/[slug]
CREATE POLICY "businesses_select_public_by_slug" ON businesses
  FOR SELECT USING (is_active = true);

-- Public can read active staff for a business (to show staff picker)
CREATE POLICY "staff_select_public" ON staff
  FOR SELECT USING (is_active = true);

-- Public can read staff_services (to show which staff can do which service)
CREATE POLICY "staff_services_select_public" ON staff_services
  FOR SELECT USING (true);

-- Public can read business_hours and staff_working_hours (for availability calc)
-- (policies already set in 0007 and 0008 as SELECT USING (true))

-- Public can read staff_time_off (for availability calc on booking page)
CREATE POLICY "staff_time_off_select_public" ON staff_time_off
  FOR SELECT USING (true);

-- Public can insert customers (upsert via server action — server validates business_id from slug)
CREATE POLICY "customers_insert_public" ON customers
  FOR INSERT WITH CHECK (true);

-- Public can insert bookings (via RPC called from server action only)
CREATE POLICY "bookings_insert_public" ON bookings
  FOR INSERT WITH CHECK (true);
