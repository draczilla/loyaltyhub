/*
  # Fix Security Issues - Indexes and RLS Optimization

  ## Overview
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## Changes Made
  
  ### 1. Add Missing Foreign Key Indexes
  Creates indexes for all unindexed foreign keys to improve query performance:
  - businesses.tier_id
  - campaigns.business_id
  - credit_transactions.admin_id
  - integrations.business_id
  - onboarding_forms.business_id
  - platform_config.updated_by
  - rewards.business_id and program_id
  - subscription_history.tier_id
  - transactions.program_id
  
  ### 2. Optimize RLS Policies
  Wraps all auth.uid() calls in SELECT statements to prevent re-evaluation for each row.
  This significantly improves query performance at scale.
  
  ### 3. Important Notes
  - Indexes are created using IF NOT EXISTS to ensure safe re-application
  - RLS policies are dropped and recreated with optimized versions
  - All security checks remain the same, only performance is improved
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for businesses.tier_id
CREATE INDEX IF NOT EXISTS idx_businesses_tier_id ON public.businesses(tier_id);

-- Index for campaigns.business_id
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON public.campaigns(business_id);

-- Index for credit_transactions.admin_id
CREATE INDEX IF NOT EXISTS idx_credit_transactions_admin_id ON public.credit_transactions(admin_id);

-- Index for integrations.business_id
CREATE INDEX IF NOT EXISTS idx_integrations_business_id ON public.integrations(business_id);

-- Index for onboarding_forms.business_id
CREATE INDEX IF NOT EXISTS idx_onboarding_forms_business_id ON public.onboarding_forms(business_id);

-- Index for platform_config.updated_by
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by ON public.platform_config(updated_by);

-- Index for rewards.business_id
CREATE INDEX IF NOT EXISTS idx_rewards_business_id ON public.rewards(business_id);

-- Index for rewards.program_id
CREATE INDEX IF NOT EXISTS idx_rewards_program_id ON public.rewards(program_id);

-- Index for subscription_history.tier_id
CREATE INDEX IF NOT EXISTS idx_subscription_history_tier_id ON public.subscription_history(tier_id);

-- Index for transactions.program_id
CREATE INDEX IF NOT EXISTS idx_transactions_program_id ON public.transactions(program_id);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES - BUSINESSES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own data" ON public.businesses;
DROP POLICY IF EXISTS "Businesses can update own data" ON public.businesses;
DROP POLICY IF EXISTS "Super admins can read all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super admins can update all businesses" ON public.businesses;

CREATE POLICY "Businesses can read own data"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Businesses can update own data"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Super admins can read all businesses"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can update all businesses"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 3: OPTIMIZE RLS POLICIES - CUSTOMERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own customers" ON public.customers;
DROP POLICY IF EXISTS "Businesses can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Businesses can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can read all customers" ON public.customers;

CREATE POLICY "Businesses can read own customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can insert own customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can update own customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 4: OPTIMIZE RLS POLICIES - SUPER_ADMINS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read own data" ON public.super_admins;

CREATE POLICY "Super admins can read own data"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

-- =====================================================
-- PART 5: OPTIMIZE RLS POLICIES - PLATFORM_CONFIG TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage platform config" ON public.platform_config;

CREATE POLICY "Super admins can manage platform config"
  ON public.platform_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 6: OPTIMIZE RLS POLICIES - SUBSCRIPTION_HISTORY TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read all subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Businesses can read own subscription history" ON public.subscription_history;

CREATE POLICY "Super admins can read all subscription history"
  ON public.subscription_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Businesses can read own subscription history"
  ON public.subscription_history
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

-- =====================================================
-- PART 7: OPTIMIZE RLS POLICIES - EMAIL_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can insert own email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Businesses can update own email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Businesses can delete own email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Businesses can read own email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Super admins can read all email templates" ON public.email_templates;

CREATE POLICY "Businesses can read own email templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can insert own email templates"
  ON public.email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can update own email templates"
  ON public.email_templates
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can delete own email templates"
  ON public.email_templates
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all email templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 8: OPTIMIZE RLS POLICIES - CREDIT_TRANSACTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Businesses can read own credit transactions" ON public.credit_transactions;

CREATE POLICY "Super admins can manage all credit transactions"
  ON public.credit_transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Businesses can read own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

-- =====================================================
-- PART 9: OPTIMIZE RLS POLICIES - LOYALTY_PROGRAMS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Super admins can read all programs" ON public.loyalty_programs;

CREATE POLICY "Businesses can manage own programs"
  ON public.loyalty_programs
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all programs"
  ON public.loyalty_programs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 10: OPTIMIZE RLS POLICIES - REWARDS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own rewards" ON public.rewards;

CREATE POLICY "Businesses can manage own rewards"
  ON public.rewards
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

-- =====================================================
-- PART 11: OPTIMIZE RLS POLICIES - TRANSACTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Super admins can read all transactions" ON public.transactions;

CREATE POLICY "Businesses can manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 12: OPTIMIZE RLS POLICIES - SMS_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read all SMS templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Businesses can manage own SMS templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Super admins can read all sms templates" ON public.sms_templates;

CREATE POLICY "Businesses can manage own SMS templates"
  ON public.sms_templates
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all SMS templates"
  ON public.sms_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 13: OPTIMIZE RLS POLICIES - QR_CODES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own QR codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Super admins can read all qr codes" ON public.qr_codes;

CREATE POLICY "Businesses can manage own QR codes"
  ON public.qr_codes
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all qr codes"
  ON public.qr_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 14: OPTIMIZE RLS POLICIES - ONBOARDING_FORMS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own forms" ON public.onboarding_forms;

CREATE POLICY "Businesses can manage own forms"
  ON public.onboarding_forms
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

-- =====================================================
-- PART 15: OPTIMIZE RLS POLICIES - CAMPAIGNS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Super admins can read all campaigns" ON public.campaigns;

CREATE POLICY "Businesses can manage own campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all campaigns"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 16: OPTIMIZE RLS POLICIES - INTEGRATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own integrations" ON public.integrations;

CREATE POLICY "Businesses can manage own integrations"
  ON public.integrations
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = business_id)
  WITH CHECK ((select auth.uid()) = business_id);

-- =====================================================
-- PART 17: OPTIMIZE RLS POLICIES - SMS_LOGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can view own SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Businesses can insert own SMS logs" ON public.sms_logs;

CREATE POLICY "Businesses can view own SMS logs"
  ON public.sms_logs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can insert own SMS logs"
  ON public.sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = business_id);

-- =====================================================
-- PART 18: OPTIMIZE RLS POLICIES - STRIPE_CUSTOMERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read all stripe customer records" ON public.stripe_customers;
DROP POLICY IF EXISTS "Businesses can read own stripe customer record" ON public.stripe_customers;

CREATE POLICY "Super admins can read all stripe customer records"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Businesses can read own stripe customer record"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

-- =====================================================
-- PART 19: OPTIMIZE RLS POLICIES - COMMUNICATION_LOGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Businesses can insert own communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Super admins can read all communication logs" ON public.communication_logs;

CREATE POLICY "Businesses can read own communication logs"
  ON public.communication_logs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = business_id);

CREATE POLICY "Businesses can insert own communication logs"
  ON public.communication_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = business_id);

CREATE POLICY "Super admins can read all communication logs"
  ON public.communication_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 20: OPTIMIZE RLS POLICIES - SUBSCRIPTION_TIERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can update subscription tiers" ON public.subscription_tiers;

CREATE POLICY "Super admins can update subscription tiers"
  ON public.subscription_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );