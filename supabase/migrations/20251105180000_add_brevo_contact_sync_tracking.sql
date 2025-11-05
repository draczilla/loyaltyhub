/*
  # Add Brevo Contact Sync Tracking

  1. Purpose
    - Track synchronization of LoyaltyHub customers to Brevo contact lists
    - Store Brevo contact IDs and sync status for each customer
    - Maintain detailed logs of all sync attempts for audit and troubleshooting
    - Enable bidirectional sync between LoyaltyHub and Brevo

  2. Changes to Existing Tables
    - `customers` table:
      - `brevo_contact_id` (text) - Brevo's unique contact identifier
      - `brevo_synced_at` (timestamptz) - Last successful sync timestamp
      - `brevo_sync_status` (text) - Current sync status: pending, synced, failed
      - `brevo_list_ids` (jsonb) - Array of Brevo list IDs this contact belongs to

  3. New Tables
    - `brevo_sync_logs`:
      - Tracks all sync attempts (success and failure)
      - Stores request/response data for debugging
      - Links to customer and business for reporting
      - Includes error messages and retry counts

  4. Security
    - Enable RLS on brevo_sync_logs table
    - Policies allow business members to view their sync logs
    - Only authenticated users can trigger syncs
    - Super admins can view all sync logs across tenants

  5. Indexes
    - Fast lookups by customer_id, business_id, sync_status
    - Efficient queries for failed syncs requiring retry
    - Quick filtering by timestamp ranges for reporting
*/

-- Add Brevo sync columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'brevo_contact_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN brevo_contact_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'brevo_synced_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN brevo_synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'brevo_sync_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN brevo_sync_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'brevo_list_ids'
  ) THEN
    ALTER TABLE customers ADD COLUMN brevo_list_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN customers.brevo_contact_id IS 'Brevo unique contact identifier for synced customers';
COMMENT ON COLUMN customers.brevo_synced_at IS 'Timestamp of last successful sync to Brevo';
COMMENT ON COLUMN customers.brevo_sync_status IS 'Sync status: pending, synced, failed, or null if never synced';
COMMENT ON COLUMN customers.brevo_list_ids IS 'Array of Brevo list IDs this contact belongs to';

-- Create brevo_sync_logs table
CREATE TABLE IF NOT EXISTS brevo_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sync_status text NOT NULL CHECK (sync_status IN ('success', 'failed', 'pending')),
  brevo_contact_id text,
  brevo_list_ids jsonb DEFAULT '[]'::jsonb,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customers_brevo_contact_id ON customers(brevo_contact_id);
CREATE INDEX IF NOT EXISTS idx_customers_brevo_sync_status ON customers(brevo_sync_status);
CREATE INDEX IF NOT EXISTS idx_customers_brevo_synced_at ON customers(brevo_synced_at);
CREATE INDEX IF NOT EXISTS idx_brevo_sync_logs_customer_id ON brevo_sync_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_brevo_sync_logs_business_id ON brevo_sync_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_brevo_sync_logs_tenant_id ON brevo_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brevo_sync_logs_sync_status ON brevo_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_brevo_sync_logs_created_at ON brevo_sync_logs(created_at);

-- Enable RLS on brevo_sync_logs
ALTER TABLE brevo_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Business members can view their sync logs
CREATE POLICY "Business members can view sync logs"
  ON brevo_sync_logs FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT id FROM businesses WHERE auth.uid() = id)
  );

-- Policy: Service role can manage all sync logs
CREATE POLICY "Service role can manage sync logs"
  ON brevo_sync_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Super admins can view all sync logs
CREATE POLICY "Super admins can view all sync logs"
  ON brevo_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins WHERE id = auth.uid()
    )
  );

-- Add Brevo list ID to platform_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'brevo_default_list_id'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN brevo_default_list_id text;
  END IF;
END $$;

COMMENT ON COLUMN platform_settings.brevo_default_list_id IS 'Default Brevo list ID for syncing all LoyaltyHub customers';

-- Function to update brevo_sync_logs updated_at timestamp
CREATE OR REPLACE FUNCTION update_brevo_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_brevo_sync_logs_updated_at ON brevo_sync_logs;
CREATE TRIGGER update_brevo_sync_logs_updated_at
  BEFORE UPDATE ON brevo_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_brevo_sync_logs_updated_at();
