/*
  # Add VAT Number to Company Information

  1. Changes
    - Add `vat_number` column to `tenants` table (text, nullable)
    - Add `vat_number` column to `businesses` table (text, nullable)
  
  2. Purpose
    - Allow companies to store their VAT registration number
    - Support tax compliance and invoicing requirements
    - Enable businesses to display VAT information on customer communications
  
  3. Notes
    - VAT number is optional (nullable) as not all businesses require it
    - Field can store various VAT formats (EU VAT, US EIN, etc.)
    - No format validation at database level to support international formats
*/

-- Add vat_number to tenants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE tenants ADD COLUMN vat_number text;
  END IF;
END $$;

-- Add vat_number to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE businesses ADD COLUMN vat_number text;
  END IF;
END $$;
