/*
  # Add is_default Column to Email Templates

  ## Problem
  The create_default_email_templates_for_business trigger and related functions
  reference an is_default column that doesn't exist in the email_templates table.

  ## Solution
  Add the is_default column to email_templates table.

  ## Changes
  1. Add is_default boolean column with default false
  2. This allows the system to distinguish between default/template emails and custom ones
*/

-- Add is_default column to email_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN is_default boolean DEFAULT false;
  END IF;
END $$;
