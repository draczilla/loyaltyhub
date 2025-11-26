/*
  # Add Company Profile Contact and Address Fields

  ## Overview
  This migration adds comprehensive contact and address information fields to both
  the `businesses` and `tenants` tables to support complete company profiles.

  ## Schema Changes

  ### `businesses` table additions:
  - `address_line1` (text) - Street address line 1
  - `address_line2` (text) - Street address line 2 (optional)
  - `city` (text) - City name
  - `state_province` (text) - State or province
  - `postal_code` (text) - Postal or ZIP code
  - `country` (text) - Country name
  - `contact_phone` (text) - Business contact phone number
  - `website` (text) - Company website URL

  ### `tenants` table additions:
  - Same fields as businesses table for consistency
  - Enables tenant-level company profile management

  ## Security
  - All fields are optional (nullable)
  - Existing RLS policies cover these fields
  - No sensitive data exposure concerns
  - Fields can be updated by business owners and tenant admins

  ## Important Notes
  1. All new fields default to NULL (optional)
  2. No data migration needed - existing records remain valid
  3. Website field should store full URLs (e.g., https://example.com)
  4. Contact phone can store international formats
  5. Country field stores country name (not code)
  6. Address fields support international addresses
*/

-- Add contact and address fields to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE businesses ADD COLUMN address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE businesses ADD COLUMN address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'city'
  ) THEN
    ALTER TABLE businesses ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'state_province'
  ) THEN
    ALTER TABLE businesses ADD COLUMN state_province text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE businesses ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'country'
  ) THEN
    ALTER TABLE businesses ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'website'
  ) THEN
    ALTER TABLE businesses ADD COLUMN website text;
  END IF;
END $$;

-- Add contact and address fields to tenants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE tenants ADD COLUMN address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE tenants ADD COLUMN address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'city'
  ) THEN
    ALTER TABLE tenants ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'state_province'
  ) THEN
    ALTER TABLE tenants ADD COLUMN state_province text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE tenants ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'country'
  ) THEN
    ALTER TABLE tenants ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE tenants ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'website'
  ) THEN
    ALTER TABLE tenants ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE tenants ADD COLUMN vat_number text;
  END IF;
END $$;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_businesses_country ON businesses(country);
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country);