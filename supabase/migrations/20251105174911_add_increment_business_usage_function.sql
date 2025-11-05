/*
  # Add increment_business_usage function

  1. Purpose
    - Safely increment usage counters for businesses (SMS, customers, etc.)
    - Prevents race conditions when updating usage metrics
    - Used by both Edge Functions and frontend components

  2. New Function
    - `increment_business_usage(p_business_id uuid, p_column_name text)`
    - Parameters:
      - p_business_id: The business UUID to update
      - p_column_name: The column to increment (usage_sms_monthly, usage_customers, etc.)
    - Returns: void
    - Security: Uses SECURITY DEFINER with explicit search_path for safety
    - Validates: Only allows incrementing specific usage columns

  3. Security
    - Function executes with definer privileges to avoid RLS conflicts
    - Explicit search path prevents SQL injection
    - Column name validation prevents unauthorized updates
    - Only increments allowed usage columns
*/

-- Create function to safely increment business usage counters
CREATE OR REPLACE FUNCTION public.increment_business_usage(
  p_business_id uuid,
  p_column_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate column name to prevent SQL injection
  IF p_column_name NOT IN ('usage_sms_monthly', 'usage_customers', 'usage_email_monthly') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column_name;
  END IF;

  -- Increment the specified usage column
  EXECUTE format(
    'UPDATE public.businesses SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    p_column_name,
    p_column_name
  ) USING p_business_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_business_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_business_usage(uuid, text) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.increment_business_usage IS 'Safely increments business usage counters to track SMS, email, and customer usage metrics';
