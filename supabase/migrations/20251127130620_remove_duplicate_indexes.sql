/*
  # Remove Duplicate Indexes

  1. Performance Improvements
    - Remove duplicate indexes that waste storage and slow down writes
    - Keep the most semantically meaningful index name
    - Reduces index maintenance overhead

  2. Duplicate Indexes to Remove
    - communication_logs: idx_communication_logs_test_emails (keep idx_communication_logs_is_test_email)
    - credit_transactions: idx_credit_transactions_business (keep idx_credit_transactions_business_id)
    - customers: idx_customers_business (keep idx_customers_business_id)
    - qr_codes: idx_qr_codes_business (keep idx_qr_codes_business_id)
    - referral_codes: idx_referral_codes_code (keep referral_codes_referral_code_key as it's a unique constraint)
    - transactions: idx_transactions_business (keep idx_transactions_business_id)

  3. Notes
    - DROP IF EXISTS ensures idempotency
    - Keeps indexes with clearer naming convention
*/

-- Drop duplicate index on communication_logs
DROP INDEX IF EXISTS idx_communication_logs_test_emails;

-- Drop duplicate index on credit_transactions
DROP INDEX IF EXISTS idx_credit_transactions_business;

-- Drop duplicate index on customers
DROP INDEX IF EXISTS idx_customers_business;

-- Drop duplicate index on qr_codes
DROP INDEX IF EXISTS idx_qr_codes_business;

-- Drop duplicate index on referral_codes (keep the unique constraint)
DROP INDEX IF EXISTS idx_referral_codes_code;

-- Drop duplicate index on transactions
DROP INDEX IF EXISTS idx_transactions_business;

-- Add comment
COMMENT ON INDEX idx_communication_logs_is_test_email IS 'Single index for test email filtering';
COMMENT ON INDEX idx_credit_transactions_business_id IS 'Primary business foreign key index';
COMMENT ON INDEX idx_customers_business_id IS 'Primary business foreign key index';
COMMENT ON INDEX idx_qr_codes_business_id IS 'Primary business foreign key index';
COMMENT ON INDEX idx_transactions_business_id IS 'Primary business foreign key index';
