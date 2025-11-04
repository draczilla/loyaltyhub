/*
  # Fix All RLS Policies - Remove Businesses Table Subqueries

  ## Issue
  All RLS policies were using subqueries like:
  `business_id IN (SELECT id FROM businesses WHERE auth.uid() = id)`
  
  This causes problems because:
  1. It's inefficient (unnecessary subquery for simple equality check)
  2. It can cause recursion issues when combined with businesses table policies
  3. Since auth.uid() = business_id for all businesses, we can simplify

  ## Solution
  Replace all subquery-based policies with direct equality checks:
  `business_id = auth.uid()`

  This is valid because in this system, the business user's auth.uid() 
  IS their business_id (they're the same UUID).

  ## Security
  - All policies remain restrictive
  - Businesses can only access their own data
  - Super admin policies use direct is_super_admin column checks
*/

-- Fix customers policies
DROP POLICY IF EXISTS "Businesses can read own customers" ON customers;
DROP POLICY IF EXISTS "Businesses can insert own customers" ON customers;
DROP POLICY IF EXISTS "Businesses can update own customers" ON customers;

CREATE POLICY "Businesses can read own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Businesses can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Businesses can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix loyalty_programs policies
DROP POLICY IF EXISTS "Businesses can manage own programs" ON loyalty_programs;

CREATE POLICY "Businesses can manage own programs"
  ON loyalty_programs FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix rewards policies
DROP POLICY IF EXISTS "Businesses can manage own rewards" ON rewards;

CREATE POLICY "Businesses can manage own rewards"
  ON rewards FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix transactions policies
DROP POLICY IF EXISTS "Businesses can manage own transactions" ON transactions;

CREATE POLICY "Businesses can manage own transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix qr_codes policies
DROP POLICY IF EXISTS "Businesses can manage own QR codes" ON qr_codes;

CREATE POLICY "Businesses can manage own QR codes"
  ON qr_codes FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix onboarding_forms policies
DROP POLICY IF EXISTS "Businesses can manage own forms" ON onboarding_forms;

CREATE POLICY "Businesses can manage own forms"
  ON onboarding_forms FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix campaigns policies
DROP POLICY IF EXISTS "Businesses can manage own campaigns" ON campaigns;

CREATE POLICY "Businesses can manage own campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix integrations policies
DROP POLICY IF EXISTS "Businesses can manage own integrations" ON integrations;

CREATE POLICY "Businesses can manage own integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Fix sms_logs policies
DROP POLICY IF EXISTS "Businesses can view own SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Businesses can insert own SMS logs" ON sms_logs;

CREATE POLICY "Businesses can view own SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Businesses can insert own SMS logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (business_id = auth.uid());

-- Fix sms_templates policies
DROP POLICY IF EXISTS "Businesses can manage own SMS templates" ON sms_templates;

CREATE POLICY "Businesses can manage own SMS templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());
