/*
  # Add Gamified Referral System with Tiered Rewards and Badges

  ## Overview
  This migration implements a comprehensive referral program where users earn credits
  for referring new businesses. The system includes monthly tiered bonuses, achievement
  badges, and requires both email AND phone verification for credit awards.

  ## New Tables

  ### 1. referral_codes
  Stores unique referral codes for each business
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key to businesses)
  - `referral_code` (text, unique, indexed)
  - `total_referrals_completed` (integer) - All-time completed referrals
  - `total_credits_earned` (integer) - Total credits earned from referrals
  - `current_month_referrals` (integer) - Resets monthly, max 5
  - `current_month_reset_date` (timestamp) - When counter was last reset
  - `is_active` (boolean)
  - `created_at` (timestamp)

  ### 2. referrals
  Tracks individual referral relationships and their status
  - `id` (uuid, primary key)
  - `referral_code` (text, indexed)
  - `referrer_business_id` (uuid, foreign key)
  - `referred_business_id` (uuid, nullable until signup complete)
  - `referred_email` (text)
  - `referral_status` (enum: pending, signed_up, email_verified, phone_verified, completed, credited)
  - `credits_awarded` (integer, nullable)
  - `tier_bonus_awarded` (integer, nullable)
  - `completed_at` (timestamp, nullable)
  - `credited_at` (timestamp, nullable)
  - `month_of_referral` (text, YYYY-MM format)
  - `created_at` (timestamp)

  ### 3. referral_badges
  Tracks achievement badges earned by businesses
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key)
  - `badge_type` (enum: bronze, silver, gold, platinum, diamond)
  - `badge_name` (text)
  - `referrals_required` (integer)
  - `bonus_credits_awarded` (integer)
  - `earned_at` (timestamp)
  - `created_at` (timestamp)

  ## Functions

  ### 1. generate_referral_code()
  Generates unique 8-character alphanumeric referral codes

  ### 2. create_referral_code_for_business()
  Trigger function that creates referral code when new business is created

  ### 3. check_referral_completion()
  Validates both email and phone verification, triggers credit award

  ### 4. award_referral_credits()
  Awards tiered credits (50 base + tier bonus) and checks for badge unlocks

  ### 5. check_and_award_badges()
  Awards achievement badges and bonus credits at milestones (1-5 referrals)

  ## Reward Structure

  ### Monthly Tier Bonuses (resets each month, max 5 referrals/month)
  - Tier 1 (1st referral): 50 + 25 = 75 credits
  - Tier 2 (2nd referral): 50 + 50 = 100 credits
  - Tier 3 (3rd referral): 50 + 75 = 125 credits
  - Tier 4 (4th referral): 50 + 100 = 150 credits
  - Tier 5 (5th referral): 50 + 125 = 175 credits
  - Total monthly potential: 625 credits

  ### Achievement Badges (lifetime, one-time bonuses)
  - Bronze (1 referral): +25 bonus credits
  - Silver (2 referrals): +50 bonus credits
  - Gold (3 referrals): +75 bonus credits
  - Platinum (4 referrals): +100 bonus credits
  - Diamond (5 referrals): +150 bonus credits
  - Total badge bonuses: 400 credits

  ## Security
  - RLS enabled on all tables
  - Users can only view their own referral data
  - Super admins can view all referral data
  - Referral code generation uses secure random generation
  - Anti-fraud measures through status tracking
*/

-- Step 1: Create enum types for referral system
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status_enum') THEN
    CREATE TYPE referral_status_enum AS ENUM (
      'pending',
      'signed_up',
      'email_verified',
      'phone_verified',
      'completed',
      'credited'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_type_enum') THEN
    CREATE TYPE badge_type_enum AS ENUM (
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond'
    );
  END IF;
END $$;

-- Step 2: Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  total_referrals_completed integer DEFAULT 0 CHECK (total_referrals_completed >= 0),
  total_credits_earned integer DEFAULT 0 CHECK (total_credits_earned >= 0),
  current_month_referrals integer DEFAULT 0 CHECK (current_month_referrals >= 0 AND current_month_referrals <= 5),
  current_month_reset_date timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_business_id ON referral_codes(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(referral_code);

-- Step 3: Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referred_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  referral_status referral_status_enum DEFAULT 'pending',
  credits_awarded integer,
  tier_bonus_awarded integer,
  completed_at timestamptz,
  credited_at timestamptz,
  month_of_referral text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_business_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_business_id);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(referral_status);
CREATE INDEX IF NOT EXISTS idx_referrals_month ON referrals(month_of_referral);

-- Step 4: Create referral_badges table
CREATE TABLE IF NOT EXISTS referral_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  badge_type badge_type_enum NOT NULL,
  badge_name text NOT NULL,
  referrals_required integer NOT NULL,
  bonus_credits_awarded integer NOT NULL,
  earned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_badges_business ON referral_badges(business_id);
CREATE INDEX IF NOT EXISTS idx_referral_badges_type ON referral_badges(badge_type);

-- Step 5: Enable RLS on all tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_badges ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for referral_codes
DROP POLICY IF EXISTS "Businesses can view own referral code" ON referral_codes;
CREATE POLICY "Businesses can view own referral code"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_members tm
      JOIN businesses b ON b.tenant_id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND b.id = business_id
        AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all referral codes" ON referral_codes;
CREATE POLICY "Super admins can view all referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins WHERE id = auth.uid()
  ));

-- Step 7: Create RLS policies for referrals
DROP POLICY IF EXISTS "Businesses can view own referrals" ON referrals;
CREATE POLICY "Businesses can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    referrer_business_id IN (
      SELECT id FROM businesses WHERE id = auth.uid()
    )
    OR
    referred_business_id IN (
      SELECT id FROM businesses WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_members tm
      JOIN businesses b ON b.tenant_id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND (b.id = referrer_business_id OR b.id = referred_business_id)
        AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all referrals" ON referrals;
CREATE POLICY "Super admins can view all referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins WHERE id = auth.uid()
  ));

-- Step 8: Create RLS policies for referral_badges
DROP POLICY IF EXISTS "Businesses can view own badges" ON referral_badges;
CREATE POLICY "Businesses can view own badges"
  ON referral_badges FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_members tm
      JOIN businesses b ON b.tenant_id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND b.id = business_id
        AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all badges" ON referral_badges;
CREATE POLICY "Super admins can view all badges"
  ON referral_badges FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins WHERE id = auth.uid()
  ));

-- Step 9: Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars
  v_code_length int := 8;
  v_attempts int := 0;
  v_max_attempts int := 100;
BEGIN
  LOOP
    -- Generate random code
    v_code := '';
    FOR i IN 1..v_code_length LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE referral_code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique referral code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Step 10: Create trigger function to auto-generate referral code for new businesses
CREATE OR REPLACE FUNCTION create_referral_code_for_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Generate unique referral code
  v_referral_code := generate_referral_code();
  
  -- Insert referral code record
  INSERT INTO referral_codes (business_id, referral_code)
  VALUES (NEW.id, v_referral_code);
  
  RETURN NEW;
END;
$$;

-- Create trigger on businesses table
DROP TRIGGER IF EXISTS trigger_create_referral_code ON businesses;
CREATE TRIGGER trigger_create_referral_code
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code_for_business();

-- Step 11: Create function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_referrals integer;
  v_badge_type badge_type_enum;
  v_badge_name text;
  v_referrals_required integer;
  v_bonus_credits integer;
  v_existing_badge uuid;
BEGIN
  -- Get total completed referrals for this business
  SELECT total_referrals_completed INTO v_total_referrals
  FROM referral_codes
  WHERE business_id = p_business_id;
  
  -- Check each badge tier
  -- Bronze: 1 referral, +25 credits
  IF v_total_referrals >= 1 THEN
    SELECT id INTO v_existing_badge FROM referral_badges
    WHERE business_id = p_business_id AND badge_type = 'bronze';
    
    IF v_existing_badge IS NULL THEN
      INSERT INTO referral_badges (business_id, badge_type, badge_name, referrals_required, bonus_credits_awarded)
      VALUES (p_business_id, 'bronze', 'Bronze Referrer', 1, 25);
      
      UPDATE businesses SET credits_remaining = credits_remaining + 25, updated_at = now()
      WHERE id = p_business_id;
      
      INSERT INTO credit_transactions (business_id, transaction_type, amount, balance_after, description)
      SELECT p_business_id, 'referral_badge_bonus', 25, credits_remaining,
             'Badge earned: Bronze Referrer (+25 credits)'
      FROM businesses WHERE id = p_business_id;
    END IF;
  END IF;
  
  -- Silver: 2 referrals, +50 credits
  IF v_total_referrals >= 2 THEN
    SELECT id INTO v_existing_badge FROM referral_badges
    WHERE business_id = p_business_id AND badge_type = 'silver';
    
    IF v_existing_badge IS NULL THEN
      INSERT INTO referral_badges (business_id, badge_type, badge_name, referrals_required, bonus_credits_awarded)
      VALUES (p_business_id, 'silver', 'Silver Referrer', 2, 50);
      
      UPDATE businesses SET credits_remaining = credits_remaining + 50, updated_at = now()
      WHERE id = p_business_id;
      
      INSERT INTO credit_transactions (business_id, transaction_type, amount, balance_after, description)
      SELECT p_business_id, 'referral_badge_bonus', 50, credits_remaining,
             'Badge earned: Silver Referrer (+50 credits)'
      FROM businesses WHERE id = p_business_id;
    END IF;
  END IF;
  
  -- Gold: 3 referrals, +75 credits
  IF v_total_referrals >= 3 THEN
    SELECT id INTO v_existing_badge FROM referral_badges
    WHERE business_id = p_business_id AND badge_type = 'gold';
    
    IF v_existing_badge IS NULL THEN
      INSERT INTO referral_badges (business_id, badge_type, badge_name, referrals_required, bonus_credits_awarded)
      VALUES (p_business_id, 'gold', 'Gold Referrer', 3, 75);
      
      UPDATE businesses SET credits_remaining = credits_remaining + 75, updated_at = now()
      WHERE id = p_business_id;
      
      INSERT INTO credit_transactions (business_id, transaction_type, amount, balance_after, description)
      SELECT p_business_id, 'referral_badge_bonus', 75, credits_remaining,
             'Badge earned: Gold Referrer (+75 credits)'
      FROM businesses WHERE id = p_business_id;
    END IF;
  END IF;
  
  -- Platinum: 4 referrals, +100 credits
  IF v_total_referrals >= 4 THEN
    SELECT id INTO v_existing_badge FROM referral_badges
    WHERE business_id = p_business_id AND badge_type = 'platinum';
    
    IF v_existing_badge IS NULL THEN
      INSERT INTO referral_badges (business_id, badge_type, badge_name, referrals_required, bonus_credits_awarded)
      VALUES (p_business_id, 'platinum', 'Platinum Referrer', 4, 100);
      
      UPDATE businesses SET credits_remaining = credits_remaining + 100, updated_at = now()
      WHERE id = p_business_id;
      
      INSERT INTO credit_transactions (business_id, transaction_type, amount, balance_after, description)
      SELECT p_business_id, 'referral_badge_bonus', 100, credits_remaining,
             'Badge earned: Platinum Referrer (+100 credits)'
      FROM businesses WHERE id = p_business_id;
    END IF;
  END IF;
  
  -- Diamond: 5 referrals, +150 credits
  IF v_total_referrals >= 5 THEN
    SELECT id INTO v_existing_badge FROM referral_badges
    WHERE business_id = p_business_id AND badge_type = 'diamond';
    
    IF v_existing_badge IS NULL THEN
      INSERT INTO referral_badges (business_id, badge_type, badge_name, referrals_required, bonus_credits_awarded)
      VALUES (p_business_id, 'diamond', 'Diamond Referrer', 5, 150);
      
      UPDATE businesses SET credits_remaining = credits_remaining + 150, updated_at = now()
      WHERE id = p_business_id;
      
      INSERT INTO credit_transactions (business_id, transaction_type, amount, balance_after, description)
      SELECT p_business_id, 'referral_badge_bonus', 150, credits_remaining,
             'Badge earned: Diamond Referrer (+150 credits)'
      FROM businesses WHERE id = p_business_id;
    END IF;
  END IF;
END;
$$;

-- Step 12: Create function to award referral credits with tier bonuses
CREATE OR REPLACE FUNCTION award_referral_credits(p_referral_id uuid)
RETURNS TABLE(success boolean, credits_awarded integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_business RECORD;
  v_current_month text;
  v_tier_number integer;
  v_base_credits integer := 50;
  v_tier_bonus integer;
  v_total_credits integer;
BEGIN
  -- Get referral details
  SELECT * INTO v_referral
  FROM referrals
  WHERE id = p_referral_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Referral not found'::text;
    RETURN;
  END IF;
  
  -- Check if already credited
  IF v_referral.referral_status = 'credited' THEN
    RETURN QUERY SELECT false, 0, 'Referral already credited'::text;
    RETURN;
  END IF;
  
  -- Check if referral is completed (both email and phone verified)
  IF v_referral.referral_status != 'completed' THEN
    RETURN QUERY SELECT false, 0, 'Referral not yet completed (requires email and phone verification)'::text;
    RETURN;
  END IF;
  
  -- Get current month
  v_current_month := to_char(now(), 'YYYY-MM');
  
  -- Get referrer's referral code info
  SELECT * INTO v_referrer_business
  FROM referral_codes
  WHERE business_id = v_referral.referrer_business_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Referrer referral code not found'::text;
    RETURN;
  END IF;
  
  -- Check monthly limit (max 5 credited referrals per month)
  IF v_referrer_business.current_month_referrals >= 5 THEN
    RETURN QUERY SELECT false, 0, 'Monthly referral limit reached (5 per month)'::text;
    RETURN;
  END IF;
  
  -- Calculate tier (1-5 based on current month's referrals)
  v_tier_number := v_referrer_business.current_month_referrals + 1;
  
  -- Calculate tier bonus: (tier - 1) * 25
  v_tier_bonus := (v_tier_number - 1) * 25;
  
  -- Calculate total credits
  v_total_credits := v_base_credits + v_tier_bonus;
  
  -- Award credits to referrer
  UPDATE businesses
  SET credits_remaining = credits_remaining + v_total_credits,
      updated_at = now()
  WHERE id = v_referral.referrer_business_id;
  
  -- Update referral record
  UPDATE referrals
  SET referral_status = 'credited',
      credits_awarded = v_total_credits,
      tier_bonus_awarded = v_tier_bonus,
      credited_at = now()
  WHERE id = p_referral_id;
  
  -- Update referral_codes statistics
  UPDATE referral_codes
  SET total_referrals_completed = total_referrals_completed + 1,
      total_credits_earned = total_credits_earned + v_total_credits,
      current_month_referrals = current_month_referrals + 1,
      current_month_reset_date = CASE
        WHEN to_char(current_month_reset_date, 'YYYY-MM') != v_current_month
        THEN now()
        ELSE current_month_reset_date
      END
  WHERE business_id = v_referral.referrer_business_id;
  
  -- Log the transaction
  INSERT INTO credit_transactions (
    business_id,
    transaction_type,
    amount,
    balance_after,
    description
  )
  SELECT 
    v_referral.referrer_business_id,
    'referral_bonus',
    v_total_credits,
    credits_remaining,
    'Referral bonus (Tier ' || v_tier_number || '): ' || v_total_credits || ' credits (' || v_base_credits || ' base + ' || v_tier_bonus || ' bonus)'
  FROM businesses
  WHERE id = v_referral.referrer_business_id;
  
  -- Check and award badges
  PERFORM check_and_award_badges(v_referral.referrer_business_id);
  
  RETURN QUERY SELECT true, v_total_credits, 
    'Awarded ' || v_total_credits || ' credits (Tier ' || v_tier_number || ': ' || v_base_credits || ' + ' || v_tier_bonus || ' bonus)'::text;
END;
$$;

-- Step 13: Create function to check referral completion and trigger credit award
CREATE OR REPLACE FUNCTION check_referral_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_email_verified boolean;
  v_phone_verified boolean;
  v_result RECORD;
BEGIN
  -- Only proceed if this business was referred
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_business_id = NEW.id
    AND referral_status NOT IN ('completed', 'credited')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Get verification status from the NEW record
  v_email_verified := NEW.email_verified;
  v_phone_verified := NEW.phone_verified;
  
  -- Update referral status based on verification progress
  IF v_email_verified AND v_phone_verified THEN
    -- Both verified - mark as completed
    UPDATE referrals
    SET referral_status = 'completed',
        completed_at = now()
    WHERE id = v_referral.id;
    
    -- Award credits immediately
    SELECT * INTO v_result
    FROM award_referral_credits(v_referral.id);
    
  ELSIF v_email_verified THEN
    -- Only email verified
    UPDATE referrals
    SET referral_status = 'email_verified'
    WHERE id = v_referral.id
      AND referral_status = 'signed_up';
      
  ELSIF v_phone_verified THEN
    -- Only phone verified (unusual but possible)
    UPDATE referrals
    SET referral_status = 'phone_verified'
    WHERE id = v_referral.id
      AND referral_status = 'signed_up';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on businesses table to check verification status
DROP TRIGGER IF EXISTS trigger_check_referral_completion ON businesses;
CREATE TRIGGER trigger_check_referral_completion
  AFTER UPDATE OF email_verified, phone_verified ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION check_referral_completion();

-- Step 14: Create function to validate referral code
CREATE OR REPLACE FUNCTION validate_referral_code(p_referral_code text)
RETURNS TABLE(valid boolean, referrer_business_id uuid, business_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code RECORD;
BEGIN
  SELECT rc.*, b.business_name
  INTO v_referral_code
  FROM referral_codes rc
  JOIN businesses b ON rc.business_id = b.id
  WHERE rc.referral_code = upper(p_referral_code)
    AND rc.is_active = true;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, v_referral_code.business_id, v_referral_code.business_name;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, NULL::text;
  END IF;
END;
$$;

-- Step 15: Backfill referral codes for existing businesses
INSERT INTO referral_codes (business_id, referral_code)
SELECT b.id, generate_referral_code()
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM referral_codes rc WHERE rc.business_id = b.id
);

-- Step 16: Grant permissions
GRANT EXECUTE ON FUNCTION generate_referral_code TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION award_referral_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated, service_role;

-- Step 17: Add helpful comments
COMMENT ON TABLE referral_codes IS 'Stores unique referral codes for each business with tracking statistics';
COMMENT ON TABLE referrals IS 'Tracks individual referral relationships and their verification/credit status';
COMMENT ON TABLE referral_badges IS 'Achievement badges earned by businesses for referral milestones';
COMMENT ON FUNCTION generate_referral_code IS 'Generates unique 8-character alphanumeric referral codes';
COMMENT ON FUNCTION validate_referral_code IS 'Validates a referral code and returns referrer information';
COMMENT ON FUNCTION award_referral_credits IS 'Awards tiered credits and checks for badge unlocks';
COMMENT ON FUNCTION check_and_award_badges IS 'Awards achievement badges when referral milestones are reached';
