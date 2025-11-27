/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves JOIN performance and query optimization
    - Essential for referential integrity checks

  2. New Indexes
    - businesses.tier_id
    - communication_logs.customer_id
    - credit_transactions.admin_id, performed_by
    - customer_program_progress.program_id
    - customer_rewards.customer_id, program_id
    - platform_config.updated_by
    - rewards.program_id
    - sms_logs.campaign_id, customer_id
    - subscription_history.tier_id
    - transactions.program_id

  3. Notes
    - All indexes are created with IF NOT EXISTS for idempotency
    - Indexes improve query performance for foreign key lookups
*/

-- Add index for businesses.tier_id
CREATE INDEX IF NOT EXISTS idx_businesses_tier_id 
ON businesses(tier_id);

-- Add index for communication_logs.customer_id
CREATE INDEX IF NOT EXISTS idx_communication_logs_customer_id 
ON communication_logs(customer_id);

-- Add indexes for credit_transactions foreign keys
CREATE INDEX IF NOT EXISTS idx_credit_transactions_admin_id 
ON credit_transactions(admin_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_performed_by 
ON credit_transactions(performed_by);

-- Add index for customer_program_progress.program_id
CREATE INDEX IF NOT EXISTS idx_customer_program_progress_program_id 
ON customer_program_progress(program_id);

-- Add indexes for customer_rewards foreign keys
CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer_id_fk 
ON customer_rewards(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_rewards_program_id_fk 
ON customer_rewards(program_id);

-- Add index for platform_config.updated_by
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by 
ON platform_config(updated_by);

-- Add index for rewards.program_id
CREATE INDEX IF NOT EXISTS idx_rewards_program_id 
ON rewards(program_id);

-- Add indexes for sms_logs foreign keys
CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign_id 
ON sms_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id_fk 
ON sms_logs(customer_id);

-- Add index for subscription_history.tier_id
CREATE INDEX IF NOT EXISTS idx_subscription_history_tier_id 
ON subscription_history(tier_id);

-- Add index for transactions.program_id
CREATE INDEX IF NOT EXISTS idx_transactions_program_id_fk 
ON transactions(program_id);

-- Add comment
COMMENT ON INDEX idx_businesses_tier_id IS 'Foreign key index for improved JOIN performance';
COMMENT ON INDEX idx_communication_logs_customer_id IS 'Foreign key index for improved JOIN performance';
