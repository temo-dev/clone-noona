-- 0010_customers.sql
-- Lightweight customer records (not a CRM — just supports bookings)

CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes: one customer per email per business, one per phone per business
CREATE UNIQUE INDEX uq_customer_email ON customers (business_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_customer_phone ON customers (business_id, phone) WHERE phone IS NOT NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "customers_insert_owner_manager_staff" ON customers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
