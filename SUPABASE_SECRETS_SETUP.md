# Supabase Edge Function Secrets Configuration

This guide explains how to configure all required secrets for LoyaltyHub Edge Functions.

## Overview

Edge Functions run in Supabase's secure environment and need access to third-party API credentials. These credentials must be stored as Supabase Secrets (NOT in your frontend environment variables).

## How to Add Secrets

### Method 1: Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. Click on **Settings** or **Secrets** tab
5. Add each secret with the exact name and value shown below
6. Click **Save** after adding each secret

### Method 2: Supabase CLI

```bash
# Set a single secret
supabase secrets set SECRET_NAME=secret_value

# Set multiple secrets from file
supabase secrets set --env-file .env.production
```

## Required Secrets Checklist

Copy and paste this checklist when configuring your secrets:

### Core Application Settings

```bash
# Your production domain (REQUIRED)
APP_URL=https://your-bolt-app.bolt.new
```

**Purpose:** Used to generate verification links and callback URLs
**Where to get it:** Your Bolt.new deployment URL

---

### Email Configuration (Brevo)

```bash
# Brevo API Key (REQUIRED for email)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sender email address (REQUIRED for email)
EMAIL_FROM=noreply@yourdomain.com

# Sender display name (REQUIRED for email)
EMAIL_FROM_NAME=LoyaltyHub
```

**Purpose:** Sends transactional emails (verification, invitations, notifications)

**Where to get these:**
1. Create account at https://app.brevo.com
2. Go to Settings → SMTP & API → API Keys
3. Create new API key (copy the full key starting with `xkeysib-`)
4. Go to Settings → Senders & IP
5. Verify your sender email domain
6. Use verified email for `EMAIL_FROM`

**Test it works:**
- Send a test email from Super Admin → Test Communications page

---

### SMS Configuration - Option 1: Brevo (Recommended)

```bash
# Brevo SMS Sender (OPTIONAL - uses same BREVO_API_KEY as email)
BREVO_SMS_SENDER=YourBrand
```

**Purpose:** Primary SMS provider for verification codes and notifications

**Where to get this:**
- Use the same Brevo account as email
- Sender can be:
  - Alphanumeric ID: 3-11 characters (e.g., "LoyaltyHub")
  - Phone number in E.164 format (e.g., "+12345678900")
- Some countries require sender ID pre-registration

**Note:** Brevo SMS and Email use the SAME API key

---

### SMS Configuration - Option 2: Vonage (Alternative)

```bash
# Vonage API Credentials (OPTIONAL)
VONAGE_API_KEY=xxxxxxxx
VONAGE_API_SECRET=xxxxxxxxxxxxxxxx
VONAGE_FROM_NUMBER=+12345678900
```

**Purpose:** Alternative SMS provider

**Where to get these:**
1. Create account at https://dashboard.nexmo.com
2. API Key and Secret are shown on dashboard
3. Purchase a phone number or configure alphanumeric sender ID
4. Use phone number or sender ID for `VONAGE_FROM_NUMBER`

---

### SMS Configuration - Option 3: Twilio (Fallback)

```bash
# Twilio Credentials (OPTIONAL)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+12345678900
```

**Purpose:** Fallback SMS provider when Brevo/Vonage are unavailable

**Where to get these:**
1. Create account at https://console.twilio.com
2. Copy Account SID and Auth Token from dashboard
3. Purchase a phone number with SMS capabilities
4. Use phone number in E.164 format for `TWILIO_PHONE_NUMBER`

---

### Stripe Configuration

```bash
# Stripe Secret Key (REQUIRED for payments)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook Secret (REQUIRED for webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Purpose:** Process payments and manage subscriptions

**Where to get these:**

**Secret Key:**
1. Go to https://dashboard.stripe.com
2. Navigate to Developers → API keys
3. Copy the "Secret key" (starts with `sk_live_` for production)
4. Use `sk_test_` keys for testing

**Webhook Secret:**
1. Go to Developers → Webhooks in Stripe dashboard
2. Click "Add endpoint"
3. URL: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

---

## Secrets Priority and Fallback Logic

### Email Sending
1. **Primary:** Brevo (configured via `BREVO_API_KEY` + `EMAIL_FROM`)
2. **Fallback:** SendGrid (if `SENDGRID_API_KEY` is set)
3. **Note:** Only one email provider is typically needed

### SMS Sending
1. **Primary:** Brevo SMS (if `BREVO_SMS_SENDER` is set)
2. **Fallback 1:** Vonage (if `VONAGE_API_KEY` is set)
3. **Fallback 2:** Twilio (if `TWILIO_ACCOUNT_SID` is set)
4. **Note:** Having multiple SMS providers provides redundancy

## Minimum Required Configuration

To get started with basic functionality, you only need:

```bash
# Minimum Secrets for Basic Functionality
APP_URL=https://your-bolt-app.bolt.new
BREVO_API_KEY=xkeysib-your-key-here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=LoyaltyHub
STRIPE_SECRET_KEY=sk_live_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

This will enable:
- User authentication and email verification
- Stripe payment processing
- Email notifications

For SMS functionality, add at least one SMS provider (Brevo, Vonage, or Twilio).

## Edge Functions That Use Secrets

### Email Functions
- `send-transactional-email` - Uses: BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME
- `send-welcome-verification` - Uses: BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME, APP_URL
- `send-team-invitation` - Uses: BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME, APP_URL
- `send-system-alert` - Uses: BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME
- `track-email-open` - Uses: None (reads from database)

### SMS Functions
- `send-transactional-sms` - Uses: BREVO_SMS_SENDER, VONAGE_*, TWILIO_*
- `send-phone-verification` - Uses: BREVO_SMS_SENDER, VONAGE_*, TWILIO_*, APP_URL

### Payment Functions
- `create-checkout-session` - Uses: STRIPE_SECRET_KEY
- `create-portal-session` - Uses: STRIPE_SECRET_KEY
- `stripe-webhook` - Uses: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

### Monitoring Functions
- `fetch-brevo-balance` - Uses: BREVO_API_KEY

## Testing Your Configuration

### Test Email Sending

```bash
curl -X POST \
  https://YOUR-PROJECT.supabase.co/functions/v1/send-transactional-email \
  -H "Authorization: Bearer YOUR-SUPABASE-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "htmlContent": "<h1>Test</h1><p>This is a test email</p>"
  }'
```

### Test SMS Sending

```bash
curl -X POST \
  https://YOUR-PROJECT.supabase.co/functions/v1/send-transactional-sms \
  -H "Authorization: Bearer YOUR-SUPABASE-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+12345678900",
    "message": "Test SMS from LoyaltyHub"
  }'
```

### Test Stripe Integration

Use the Super Admin dashboard or the application's subscription page to test Stripe checkout.

## Troubleshooting

### Email Not Sending

**Check:**
1. `BREVO_API_KEY` is set and valid
2. `EMAIL_FROM` is verified in Brevo account
3. Brevo account has sufficient credits
4. Check Edge Function logs for errors

**Error: "Invalid API key"**
- Verify the API key is complete and starts with `xkeysib-`
- Regenerate key in Brevo if needed

**Error: "Sender not authorized"**
- Verify sender email in Brevo dashboard
- Allow 24-48 hours for verification

### SMS Not Sending

**Check:**
1. At least one SMS provider is configured
2. Phone numbers are in E.164 format (+1234567890)
3. SMS provider account has sufficient credits
4. Sender ID is approved (if using alphanumeric)

**Error: "No SMS provider configured"**
- Set at least one of: BREVO_SMS_SENDER, VONAGE_API_KEY, or TWILIO_ACCOUNT_SID

**Error: "Invalid sender ID"**
- Some countries require sender ID pre-registration
- Use phone number instead of alphanumeric sender

### Stripe Errors

**Error: "Invalid API key"**
- Ensure you're using the correct key format (sk_live_* for production)
- Check that key has not been revoked

**Error: "Webhook signature verification failed"**
- Verify STRIPE_WEBHOOK_SECRET matches the secret in Stripe dashboard
- Ensure webhook endpoint URL is correct

### General Debugging

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → Select function → Logs
2. **Verify Secrets Are Set:**
   - Supabase Dashboard → Edge Functions → Secrets
3. **Test with curl:**
   - Use the test commands above to isolate issues
4. **Check Rate Limits:**
   - Review `verification_attempts` table in database

## Security Best Practices

1. **Never commit secrets to git**
   - Secrets should only be in Supabase dashboard
   - Use .env.example for documentation only

2. **Use production keys for production**
   - Stripe: Use `sk_live_*` and `pk_live_*`
   - Test with `sk_test_*` keys in development

3. **Rotate secrets regularly**
   - Generate new API keys every 90 days
   - Update Supabase secrets when rotating

4. **Monitor usage**
   - Check Brevo balance via `fetch-brevo-balance` function
   - Monitor Stripe dashboard for payment issues
   - Review `communication_logs` table for delivery failures

5. **Restrict API key permissions**
   - Brevo: Only enable email/SMS permissions
   - Stripe: Use restricted keys when possible

## Quick Copy-Paste Template

Use this template to prepare your secrets before adding them to Supabase:

```bash
# Core
APP_URL=

# Email (Brevo)
BREVO_API_KEY=
EMAIL_FROM=
EMAIL_FROM_NAME=LoyaltyHub

# SMS (choose at least one)
BREVO_SMS_SENDER=
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_FROM_NUMBER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Fill in the values, then add each secret individually in the Supabase dashboard.
