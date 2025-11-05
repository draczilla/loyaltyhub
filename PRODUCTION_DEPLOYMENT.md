# LoyaltyHub Production Deployment Guide

This guide covers deploying LoyaltyHub on Bolt.new hosting with Supabase backend.

## Prerequisites

- Bolt.new account with project deployed
- Supabase project (https://supabase.com)
- Stripe account for payments
- Brevo account for email/SMS
- Vonage account for SMS (optional)

## Deployment Architecture

```
Frontend (Bolt.new)
    ↓
    Vite React SPA
    ↓
    Uses VITE_* environment variables
    ↓
Backend (Supabase)
    ↓
    PostgreSQL Database + Edge Functions
    ↓
    Uses Supabase Secrets
    ↓
External Services
    ↓
    Stripe (Payments)
    Brevo (Email/SMS)
    Vonage (SMS)
```

## Part 1: Frontend Configuration (Bolt.new)

### Environment Variables

Add these environment variables in your Bolt.new project settings:

```bash
# Supabase Connection (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

### Where to Get These Values

**Supabase URL and Anon Key:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key

**Stripe Publishable Key:**
1. Go to https://dashboard.stripe.com
2. Navigate to Developers → API keys
3. Copy the "Publishable key" (starts with `pk_live_` for production)

### Important Notes

- These are PUBLIC keys safe for client-side code
- Never add SECRET keys to Bolt.new environment variables
- The frontend will be built and deployed automatically by Bolt.new

## Part 2: Backend Configuration (Supabase)

### Step 1: Deploy Database Migrations

Your database migrations are already in `/supabase/migrations/`. Deploy them to production:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order (by timestamp)
4. Run each migration

**Option B: Using Supabase CLI (if available)**
```bash
supabase db push
```

### Step 2: Configure Edge Function Secrets

Edge Functions need access to sensitive API keys. Add these secrets in Supabase:

**Navigate to:** Project Settings → Edge Functions → Secrets (or Edge Functions → Settings)

#### Required Secrets

```bash
# Email Configuration (Brevo)
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=LoyaltyHub

# SMS Configuration (Brevo - Primary)
BREVO_SMS_SENDER=YourBrand

# SMS Configuration (Vonage - Fallback)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_FROM_NUMBER=+1234567890

# SMS Configuration (Twilio - Alternative Fallback)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe Configuration (Backend)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application URL
APP_URL=https://your-bolt-app.bolt.new
```

#### Critical Secrets (Minimum Required)

If you want to start with minimal configuration, these are REQUIRED:

```bash
# Minimum Required for Basic Functionality
BREVO_API_KEY=xkeysib-your_key_here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=LoyaltyHub
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
APP_URL=https://your-bolt-app.bolt.new
```

### Step 3: Deploy Edge Functions

You have 11 Edge Functions that need to be deployed to Supabase:

1. `create-checkout-session` - Stripe payment checkout
2. `create-portal-session` - Stripe customer portal
3. `fetch-brevo-balance` - Check email credits
4. `send-phone-verification` - SMS verification codes
5. `send-system-alert` - Internal notifications
6. `send-team-invitation` - Team member invites
7. `send-transactional-email` - Transactional emails
8. `send-transactional-sms` - Transactional SMS
9. `send-welcome-verification` - Welcome emails
10. `stripe-webhook` - Stripe webhook handler
11. `track-email-open` - Email open tracking

**To deploy using the MCP tools available in this environment:**

The functions are already in your `/supabase/functions/` directory. You can deploy them using the Supabase dashboard or CLI.

**Using Supabase CLI (recommended):**
```bash
# Deploy all functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy fetch-brevo-balance
supabase functions deploy send-phone-verification
supabase functions deploy send-system-alert
supabase functions deploy send-team-invitation
supabase functions deploy send-transactional-email
supabase functions deploy send-transactional-sms
supabase functions deploy send-welcome-verification
supabase functions deploy stripe-webhook
supabase functions deploy track-email-open
```

## Part 3: External Service Configuration

### Brevo Setup (Email & SMS)

1. **Create Account:** https://app.brevo.com
2. **Get API Key:**
   - Go to Settings → SMTP & API → API Keys
   - Create a new API key
   - Copy the key (starts with `xkeysib-`)
3. **Verify Sender Email:**
   - Go to Settings → Senders & IP
   - Add and verify your sender email
   - Use this email for `EMAIL_FROM` secret
4. **SMS Sender (optional):**
   - Configure an alphanumeric sender ID or phone number
   - Use this for `BREVO_SMS_SENDER` secret

### Vonage Setup (SMS)

1. **Create Account:** https://dashboard.nexmo.com
2. **Get API Credentials:**
   - Find API Key and API Secret in dashboard
3. **Get Phone Number:**
   - Purchase a phone number or configure sender ID
   - Use this for `VONAGE_FROM_NUMBER` secret

### Stripe Setup

1. **Create Account:** https://dashboard.stripe.com
2. **Get API Keys:**
   - Go to Developers → API keys
   - Copy Publishable key (for frontend)
   - Copy Secret key (for backend)
3. **Configure Webhook:**
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Select events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`
   - Copy webhook signing secret
4. **Create Products:**
   - Create subscription products for Free, Pro, and Agency tiers
   - Note the Price IDs for each tier

## Part 4: Testing the Deployment

### 1. Test Frontend Connectivity

Visit your Bolt.new URL and verify:
- Landing page loads correctly
- Login page is accessible
- No console errors related to Supabase connection

### 2. Test Authentication

- Create a test account
- Verify you can log in
- Check that user is created in Supabase database

### 3. Test Database Access

- After login, verify dashboard loads
- Check that RLS policies allow data access
- Verify tenant and business records are created

### 4. Test Edge Functions

Using the Super Admin Test Communications page:
- Test sending email
- Test sending SMS
- Verify communications are logged

### 5. Test Stripe Integration

- Navigate to Subscription page
- Attempt to upgrade to a paid plan
- Verify checkout session is created
- Complete a test payment (use Stripe test cards)

## Part 5: Monitoring and Troubleshooting

### Checking Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select a function and view logs
4. Look for errors or failed invocations

### Common Issues

**Issue:** "Missing Supabase environment variables"
**Solution:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Bolt.new

**Issue:** "Failed to send email/SMS"
**Solution:** Check that Brevo/Vonage secrets are set in Supabase Edge Function secrets

**Issue:** "Stripe checkout fails"
**Solution:** Verify `STRIPE_SECRET_KEY` is set in Supabase secrets and is a production key

**Issue:** "Cannot access dashboard after login"
**Solution:** Check that database migrations are applied and RLS policies are enabled

**Issue:** "Webhook signature verification failed"
**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe webhook configuration

### Database Monitoring

- Monitor RLS policy errors in Supabase logs
- Check for authentication failures
- Review verification attempts table for rate limiting issues

## Part 6: Security Checklist

- [ ] All secret keys are stored in Supabase secrets (not frontend env vars)
- [ ] Stripe uses production keys (pk_live_*, sk_live_*)
- [ ] RLS is enabled on all database tables
- [ ] Sender email is verified in Brevo
- [ ] Webhook endpoints use signature verification
- [ ] APP_URL is set to production domain
- [ ] CORS is configured in Edge Functions
- [ ] Rate limiting is enabled for verification endpoints

## Part 7: Post-Deployment Tasks

### Create Super Admin Account

1. Sign up for a regular account
2. Get the user ID from Supabase Auth users table
3. Add record to `super_admins` table:
   ```sql
   INSERT INTO super_admins (id, email)
   VALUES ('user-uuid-here', 'admin@yourdomain.com');
   ```

### Configure Platform Settings

1. Log in as super admin
2. Navigate to Super Admin → Platform Configuration
3. Set default SMS/email allowances
4. Configure rate limits
5. Set up monitoring alerts

### Initialize Subscription Tiers

Verify subscription tiers are populated:
```sql
SELECT * FROM subscription_tiers;
```

If empty, insert default tiers or use the Super Admin dashboard to create them.

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review browser console for frontend errors
- Check `communication_logs` table for email/SMS delivery status
- Review `verification_attempts` table for rate limiting issues

## Quick Reference

### Environment Variables Summary

**Frontend (Bolt.new):**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PUBLISHABLE_KEY

**Backend (Supabase Secrets):**
- BREVO_API_KEY
- EMAIL_FROM
- EMAIL_FROM_NAME
- BREVO_SMS_SENDER (optional)
- VONAGE_API_KEY (optional)
- VONAGE_API_SECRET (optional)
- VONAGE_FROM_NUMBER (optional)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- APP_URL

### Key URLs

- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com
- Brevo Dashboard: https://app.brevo.com
- Vonage Dashboard: https://dashboard.nexmo.com

### Migration Files Location

All migrations are in: `/supabase/migrations/`

Apply in chronological order (sorted by timestamp prefix).
