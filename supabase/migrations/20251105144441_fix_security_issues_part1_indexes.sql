/*
  # Fix Security Issues - Part 1: Foreign Key Indexes and Cleanup

  ## Changes Made
  
  ### 1. Add Missing Foreign Key Indexes
  - `customer_rewards.reward_id` - Index for reward lookups
  - `tenant_deletions.deleted_by` - Index for deletion audit queries
  - `tenant_invitations.invited_by` - Index for invitation tracking
  - `tenants.admin_user_id` - Index for admin user lookups
  - `transactions.reward_id` - Index for reward transaction queries
  
  ### 2. Remove Unused Indexes
  Removing 51 unused indexes that add maintenance overhead without providing query benefits:
  - Transaction and customer-related unused indexes
  - QR code and SMS log unused indexes
  - Credit transaction unused indexes
  - Webhook event unused indexes
  - Template unused indexes
  - Stripe customer unused indexes
  - Communication log unused indexes
  - Business and tenant unused indexes
  - Verification attempt unused indexes
  
  ## Performance Impact
  - Adding indexes: Improves join performance on foreign key columns
  - Removing unused indexes: Reduces write overhead and storage
  - Overall: Better database performance at scale
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for customer_rewards.reward_id foreign key
CREATE INDEX IF NOT EXISTS idx_customer_rewards_reward_id 
ON public.customer_rewards(reward_id);

-- Index for tenant_deletions.deleted_by foreign key
CREATE INDEX IF NOT EXISTS idx_tenant_deletions_deleted_by 
ON public.tenant_deletions(deleted_by);

-- Index for tenant_invitations.invited_by foreign key
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_invited_by 
ON public.tenant_invitations(invited_by);

-- Index for tenants.admin_user_id foreign key
CREATE INDEX IF NOT EXISTS idx_tenants_admin_user_id 
ON public.tenants(admin_user_id);

-- Index for transactions.reward_id foreign key
CREATE INDEX IF NOT EXISTS idx_transactions_reward_id 
ON public.transactions(reward_id);

-- =====================================================
-- REMOVE UNUSED INDEXES
-- =====================================================

-- Transaction indexes
DROP INDEX IF EXISTS public.idx_transactions_customer;
DROP INDEX IF EXISTS public.idx_transactions_program_id;

-- QR code indexes
DROP INDEX IF EXISTS public.idx_qr_codes_code;

-- SMS log indexes
DROP INDEX IF EXISTS public.idx_sms_logs_status;
DROP INDEX IF EXISTS public.idx_sms_logs_campaign;
DROP INDEX IF EXISTS public.idx_sms_logs_customer;
DROP INDEX IF EXISTS public.idx_sms_logs_sent_at;
DROP INDEX IF EXISTS public.idx_sms_logs_provider_message_id;
DROP INDEX IF EXISTS public.idx_sms_logs_provider;

-- Credit transaction indexes
DROP INDEX IF EXISTS public.idx_credit_transactions_created;
DROP INDEX IF EXISTS public.idx_credit_transactions_admin_id;

-- Webhook event indexes
DROP INDEX IF EXISTS public.idx_webhook_events_stripe_event_id;
DROP INDEX IF EXISTS public.idx_webhook_events_processed;

-- SMS template indexes
DROP INDEX IF EXISTS public.idx_sms_templates_trigger_type;
DROP INDEX IF EXISTS public.idx_sms_templates_active;

-- Stripe customer indexes
DROP INDEX IF EXISTS public.idx_stripe_customers_stripe_customer_id;
DROP INDEX IF EXISTS public.idx_stripe_customers_stripe_subscription_id;

-- Subscription history indexes
DROP INDEX IF EXISTS public.idx_subscription_history_created_at;
DROP INDEX IF EXISTS public.idx_subscription_history_tier_id;

-- Communication log indexes
DROP INDEX IF EXISTS public.idx_communication_logs_business;
DROP INDEX IF EXISTS public.idx_communication_logs_customer;
DROP INDEX IF EXISTS public.idx_communication_logs_created;
DROP INDEX IF EXISTS public.idx_communication_logs_provider;
DROP INDEX IF EXISTS public.idx_communication_logs_status;
DROP INDEX IF EXISTS public.idx_communication_logs_daily_emails;

-- Business indexes
DROP INDEX IF EXISTS public.idx_businesses_tier_id;
DROP INDEX IF EXISTS public.idx_businesses_tenant;
DROP INDEX IF EXISTS public.idx_businesses_email_verification_token;
DROP INDEX IF EXISTS public.idx_businesses_phone_verification_token;
DROP INDEX IF EXISTS public.idx_businesses_onboarding_status;
DROP INDEX IF EXISTS public.idx_businesses_phone;
DROP INDEX IF EXISTS public.idx_businesses_id;

-- Platform config indexes
DROP INDEX IF EXISTS public.idx_platform_config_updated_by;

-- Reward indexes
DROP INDEX IF EXISTS public.idx_rewards_program_id;

-- Customer program progress indexes
DROP INDEX IF EXISTS public.idx_customer_progress_customer;
DROP INDEX IF EXISTS public.idx_customer_progress_program;

-- Customer rewards indexes (keep the new FK index, remove old unused ones)
DROP INDEX IF EXISTS public.idx_customer_rewards_customer;
DROP INDEX IF EXISTS public.idx_customer_rewards_program;
DROP INDEX IF EXISTS public.idx_customer_rewards_status;
DROP INDEX IF EXISTS public.idx_customer_rewards_code;

-- Customer indexes
DROP INDEX IF EXISTS public.idx_customers_auth_phone;

-- Tenant member indexes
DROP INDEX IF EXISTS public.idx_tenant_members_user;

-- Tenant invitation indexes
DROP INDEX IF EXISTS public.idx_tenant_invitations_token;
DROP INDEX IF EXISTS public.idx_tenant_invitations_email;

-- Platform settings indexes
DROP INDEX IF EXISTS public.idx_platform_settings_updated;

-- Verification attempt indexes
DROP INDEX IF EXISTS public.idx_verification_attempts_ip;

-- Super admin indexes
DROP INDEX IF EXISTS public.idx_super_admins_id;

-- Tenant indexes
DROP INDEX IF EXISTS public.idx_tenants_id;

-- Tenant deletion indexes
DROP INDEX IF EXISTS public.idx_tenant_deletions_tenant;
DROP INDEX IF EXISTS public.idx_tenant_deletions_created;
