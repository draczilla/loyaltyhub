/*
  # Add custom URL field to QR codes

  1. Changes
    - Add `custom_url` column to `qr_codes` table to allow embedding custom URLs in QR codes
    - Column is optional (nullable) to maintain backward compatibility
  
  2. Notes
    - If custom_url is provided, the QR code will link to that URL
    - If custom_url is null, the QR code will link to the default signup form
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_codes' AND column_name = 'custom_url'
  ) THEN
    ALTER TABLE qr_codes ADD COLUMN custom_url text;
  END IF;
END $$;