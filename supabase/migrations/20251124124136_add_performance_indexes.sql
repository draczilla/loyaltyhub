/*
  # Add Performance Indexes for Faster Queries

  ## Problem
  Application has slow load times due to missing indexes on frequently queried columns.
  The get_user_auth_data function and other common queries are doing sequential scans.

  ## Solution
  Add composite and single-column indexes on frequently queried tables:
  - businesses: id, tenant_id lookups
  - tenant_members: user_id, tenant_id, status lookups
  - tenants: id lookups
  - super_admins: id lookups
  - customers: business_id lookups
  - loyalty_programs: business_id lookups
  - transactions: business_id lookups
  - communication_logs: business_id, type, status lookups

  ## Changes
  1. Add missing indexes on foreign keys
  2. Add composite indexes for common query patterns
  3. Add partial indexes for filtered queries
*/

-- Businesses table indexes
CREATE INDEX IF NOT EXISTS idx_businesses_tenant_id 
  ON businesses(tenant_id) 
  WHERE tenant_id IS NOT NULL;

-- Tenant members table indexes (critical for auth lookups)
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_status 
  ON tenant_members(user_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_status 
  ON tenant_members(tenant_id, status) 
  WHERE status = 'active';

-- Super admins table index
CREATE INDEX IF NOT EXISTS idx_super_admins_id 
  ON super_admins(id);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_business_id 
  ON customers(business_id);

CREATE INDEX IF NOT EXISTS idx_customers_business_created 
  ON customers(business_id, created_at DESC);

-- Loyalty programs table indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business_status 
  ON loyalty_programs(business_id, status) 
  WHERE status = 'active';

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_business_id 
  ON transactions(business_id);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_created 
  ON transactions(customer_id, created_at DESC);

-- Communication logs table indexes
CREATE INDEX IF NOT EXISTS idx_communication_logs_business_type 
  ON communication_logs(business_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_business_status 
  ON communication_logs(business_id, status, created_at DESC);

-- QR codes table indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_id 
  ON qr_codes(business_id);

-- Programs table indexes (if different from loyalty_programs)
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business_created 
  ON loyalty_programs(business_id, created_at DESC);

-- Tenant invitations indexes
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_status 
  ON tenant_invitations(tenant_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email 
  ON tenant_invitations(email) 
  WHERE status = 'pending';

-- Verification attempts indexes
CREATE INDEX IF NOT EXISTS idx_verification_attempts_identifier 
  ON verification_attempts(identifier, verification_type, created_at DESC);

-- Add index on subscription_tiers for public queries
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_price 
  ON subscription_tiers(price_monthly);

COMMENT ON INDEX idx_tenant_members_user_status IS 'Speeds up auth lookup for tenant members by user_id';
COMMENT ON INDEX idx_businesses_tenant_id IS 'Speeds up tenant business lookups';
COMMENT ON INDEX idx_customers_business_created IS 'Optimizes dashboard customer queries with sorting';
COMMENT ON INDEX idx_communication_logs_business_type IS 'Optimizes communication log filtering by type';
