/*
  # Fix tenant deletion to include verification_attempts table

  1. Changes
    - Updates the delete_tenant_and_data function to delete verification_attempts records
    - This prevents foreign key constraint violations during tenant deletion
  
  2. Details
    - Adds deletion of verification_attempts before deleting businesses
    - Maintains proper deletion order to respect foreign key constraints
*/

-- Drop and recreate the function with the fix
DROP FUNCTION IF EXISTS delete_tenant_and_data(uuid, uuid, text, boolean) CASCADE;

CREATE OR REPLACE FUNCTION delete_tenant_and_data(
  tenant_uuid uuid,
  admin_uuid uuid,
  deletion_reason text DEFAULT NULL,
  data_was_exported boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_name_var text;
  business_ids uuid[];
  result jsonb;
BEGIN
  -- Verify admin is super admin
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE id = admin_uuid) THEN
    RAISE EXCEPTION 'Only super admins can delete tenants';
  END IF;

  -- Get tenant name for audit log
  SELECT company_name INTO tenant_name_var
  FROM tenants
  WHERE id = tenant_uuid;

  IF tenant_name_var IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Get all business IDs for this tenant
  SELECT array_agg(id) INTO business_ids
  FROM businesses
  WHERE tenant_id = tenant_uuid;

  -- Create audit log entry
  INSERT INTO tenant_deletions (
    tenant_id,
    tenant_name,
    deleted_by,
    reason,
    data_exported,
    metadata
  ) VALUES (
    tenant_uuid,
    tenant_name_var,
    admin_uuid,
    deletion_reason,
    data_was_exported,
    jsonb_build_object(
      'deletion_timestamp', now(),
      'business_count', COALESCE(array_length(business_ids, 1), 0)
    )
  );

  -- Delete in proper order to handle foreign keys
  -- Most tables will cascade automatically via ON DELETE CASCADE

  -- Delete verification attempts (IMPORTANT: This was missing and caused FK violations)
  DELETE FROM verification_attempts WHERE business_id = ANY(business_ids);

  -- Delete communication logs
  DELETE FROM communication_logs WHERE business_id = ANY(business_ids);

  -- Delete email templates
  DELETE FROM email_templates WHERE business_id = ANY(business_ids);

  -- Delete SMS logs
  DELETE FROM sms_logs WHERE business_id = ANY(business_ids);

  -- Delete SMS templates
  DELETE FROM sms_templates WHERE business_id = ANY(business_ids);

  -- Delete integrations
  DELETE FROM integrations WHERE business_id = ANY(business_ids);

  -- Delete campaigns
  DELETE FROM campaigns WHERE business_id = ANY(business_ids);

  -- Delete onboarding forms
  DELETE FROM onboarding_forms WHERE business_id = ANY(business_ids);

  -- Delete QR codes
  DELETE FROM qr_codes WHERE business_id = ANY(business_ids);

  -- Delete transactions
  DELETE FROM transactions WHERE business_id = ANY(business_ids);

  -- Delete rewards
  DELETE FROM rewards WHERE business_id = ANY(business_ids);

  -- Delete loyalty programs
  DELETE FROM loyalty_programs WHERE business_id = ANY(business_ids);

  -- Delete customers
  DELETE FROM customers WHERE business_id = ANY(business_ids);

  -- Delete businesses
  DELETE FROM businesses WHERE tenant_id = tenant_uuid;

  -- Delete tenant invitations (CASCADE should handle this, but explicit for clarity)
  DELETE FROM tenant_invitations WHERE tenant_id = tenant_uuid;

  -- Delete tenant members (CASCADE should handle this, but explicit for clarity)
  DELETE FROM tenant_members WHERE tenant_id = tenant_uuid;

  -- Finally delete the tenant
  DELETE FROM tenants WHERE id = tenant_uuid;

  -- Build result
  result := jsonb_build_object(
    'success', true,
    'tenant_id', tenant_uuid,
    'tenant_name', tenant_name_var,
    'deleted_at', now(),
    'deleted_by', admin_uuid
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_tenant_and_data(uuid, uuid, text, boolean) TO authenticated;
