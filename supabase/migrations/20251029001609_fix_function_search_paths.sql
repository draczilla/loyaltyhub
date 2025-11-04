/*
  # Fix Function Search Paths - Security Enhancement

  ## Overview
  This migration fixes the search_path security issue for all database functions.
  Mutable search paths can lead to security vulnerabilities.
  
  ## Changes Made
  
  ### Functions Updated
  - update_platform_config_updated_at
  - deduct_credits
  - add_credits
  - update_stripe_customers_updated_at
  - create_default_email_templates
  - add_default_templates_for_new_business
  - generate_unique_customer_id
  - update_updated_at_column
  
  All functions are recreated with SECURITY DEFINER and a fixed search_path.
*/

-- =====================================================
-- FIX: update_updated_at_column
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- FIX: generate_unique_customer_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_unique_customer_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'CUST-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE customer_id = new_id) INTO id_exists;
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- FIX: add_default_templates_for_new_business
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_default_templates_for_new_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.email_templates (business_id, name, subject, body, trigger_type, is_default)
  SELECT 
    NEW.id,
    name,
    subject,
    body,
    trigger_type,
    true
  FROM public.email_templates
  WHERE business_id IS NULL AND is_default = true;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FIX: create_default_email_templates
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_email_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.email_templates (business_id, name, subject, body, trigger_type, is_default)
  VALUES
    (NULL, 'Welcome Email', 'Welcome to our loyalty program!', 
     'Hello {{customer_name}},\n\nWelcome to our loyalty program! Your customer ID is {{customer_id}}.\n\nThank you for joining us!', 
     'signup', true),
    (NULL, 'Points Earned', 'You earned points!', 
     'Hello {{customer_name}},\n\nYou just earned {{points}} points! Your new balance is {{total_points}} points.\n\nThank you for your loyalty!', 
     'points_earned', true),
    (NULL, 'Reward Redeemed', 'Reward redeemed successfully', 
     'Hello {{customer_name}},\n\nYou have successfully redeemed {{reward_name}}.\n\nEnjoy your reward!', 
     'reward_redeemed', true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- =====================================================
-- FIX: update_stripe_customers_updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_stripe_customers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- FIX: add_credits
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_credits(
  p_business_id UUID,
  p_amount INTEGER,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.businesses
  SET credits_remaining = credits_remaining + p_amount
  WHERE id = p_business_id;
  
  INSERT INTO public.credit_transactions (
    business_id,
    amount,
    transaction_type,
    reason,
    admin_id
  ) VALUES (
    p_business_id,
    p_amount,
    'credit',
    p_reason,
    p_admin_id
  );
END;
$$;

-- =====================================================
-- FIX: deduct_credits
-- =====================================================

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_business_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits_remaining INTO current_credits
  FROM public.businesses
  WHERE id = p_business_id;
  
  IF current_credits >= p_amount THEN
    UPDATE public.businesses
    SET credits_remaining = credits_remaining - p_amount
    WHERE id = p_business_id;
    
    INSERT INTO public.credit_transactions (
      business_id,
      amount,
      transaction_type,
      reason
    ) VALUES (
      p_business_id,
      -p_amount,
      'debit',
      p_reason
    );
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- =====================================================
-- FIX: update_platform_config_updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_platform_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;