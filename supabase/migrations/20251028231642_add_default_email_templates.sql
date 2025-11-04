/*
  # Add Default Email Templates

  ## Overview
  This migration adds pre-filled email templates for common use cases.
  Templates are created for each business that exists in the system.

  ## Templates Added
  1. Welcome Email - Greets new customers joining the loyalty program
  2. Birthday Email - Celebrates customer birthdays with special offers
  3. Reward Email - Notifies customers when they've earned rewards
  4. Promotional Email - General promotional messages for marketing campaigns

  ## Notes
  - Templates include dynamic variables for personalization
  - Templates are set to active by default
  - Each business will receive their own copy of these templates
*/

-- Function to create default email templates for a business
CREATE OR REPLACE FUNCTION create_default_email_templates(business_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Welcome Email Template
  INSERT INTO email_templates (business_id, name, subject, body, trigger_type, active)
  VALUES (
    business_uuid,
    'Welcome Email',
    'Welcome to {business_name}!',
    'Hi {firstName},

Welcome to {business_name}! We''re thrilled to have you as part of our loyalty program.

As a valued member, you''ll earn points with every purchase and unlock exclusive rewards. You''re already on your way with {points} points in your account!

Here''s how it works:
• Earn points with every visit
• Redeem points for amazing rewards
• Get exclusive member-only offers
• Celebrate special occasions with bonus points

We can''t wait to reward your loyalty!

Best regards,
The {business_name} Team',
    'welcome',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Birthday Email Template
  INSERT INTO email_templates (business_id, name, subject, body, trigger_type, active)
  VALUES (
    business_uuid,
    'Birthday Email',
    'Happy Birthday from {business_name}!',
    'Happy Birthday, {firstName}!

The entire team at {business_name} wants to wish you a very special day filled with joy and celebration!

To help make your birthday even more memorable, we have a special gift for you. Stop by and mention this email to receive your birthday surprise!

Current Points Balance: {points} points

Thank you for being a loyal member of our community. We appreciate you today and every day!

Warmest wishes,
The {business_name} Team',
    'birthday',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Reward Email Template
  INSERT INTO email_templates (business_id, name, subject, body, trigger_type, active)
  VALUES (
    business_uuid,
    'Reward Earned',
    'Congratulations! You''ve earned a reward at {business_name}',
    'Great news, {firstName}!

Your loyalty has paid off! You''ve earned a new reward at {business_name}.

Current Points: {points} points

You can redeem your reward on your next visit. Simply let us know you''d like to use your reward, and we''ll take care of the rest.

Thank you for being such a valued customer. We love having you as part of our community!

See you soon,
The {business_name} Team',
    'reward',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Promotional Email Template
  INSERT INTO email_templates (business_id, name, subject, body, trigger_type, active)
  VALUES (
    business_uuid,
    'Promotional Email',
    'Exclusive Offer Just for You at {business_name}',
    'Hi {firstName},

We have something special just for you!

As one of our valued loyalty members, you''re getting exclusive early access to our latest promotion. This is our way of saying thank you for your continued support.

Your Current Points: {points} points

Don''t miss out on this limited-time opportunity. Visit us soon to take advantage of this exclusive offer!

Questions? Feel free to reach out - we''re always happy to help.

Thanks for being awesome!
The {business_name} Team',
    'promotional',
    true
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create default templates for all existing businesses
DO $$
DECLARE
  business_record RECORD;
BEGIN
  FOR business_record IN SELECT id FROM businesses
  LOOP
    PERFORM create_default_email_templates(business_record.id);
  END LOOP;
END $$;

-- Create trigger to automatically add default templates for new businesses
CREATE OR REPLACE FUNCTION add_default_templates_for_new_business()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_email_templates(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_default_email_templates ON businesses;

CREATE TRIGGER trigger_add_default_email_templates
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION add_default_templates_for_new_business();
