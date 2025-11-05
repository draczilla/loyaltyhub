# Quick Start: Deploy to Production in 30 Minutes

This is a streamlined guide to get LoyaltyHub running in production as fast as possible.

## What You Need

1. **Bolt.new** - Your frontend is already here
2. **Supabase Account** - Free tier works: https://supabase.com
3. **Brevo Account** - For email/SMS: https://app.brevo.com
4. **Stripe Account** - For payments: https://stripe.com

## Step 1: Supabase Setup (10 minutes)

### Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Name it "loyaltyhub-production"
4. Choose a region close to your users
5. Set a strong database password (save it!)
6. Wait for project to initialize (~2 minutes)

### Get Connection Details
1. Go to **Settings → API**
2. Copy these values:
   - Project URL (starts with `https://`)
   - anon public key (starts with `eyJ`)

### Deploy Database
1. Go to **SQL Editor**
2. Click "New Query"
3. Copy ALL files from `/supabase/migrations/` folder
4. Paste each migration file ONE AT A TIME in order (by timestamp)
5. Click "Run" for each migration
6. Verify no errors appear

## Step 2: Bolt.new Configuration (2 minutes)

Add these environment variables in your Bolt.new project settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...your-stripe-key
```

Replace with your actual values from Step 1.

## Step 3: Get External API Keys (10 minutes)

### Brevo (Email)
1. Sign up at https://app.brevo.com (free tier available)
2. Go to **Settings → SMTP & API → API Keys**
3. Click "Generate a new API key"
4. Copy the key (starts with `xkeysib-`)
5. Go to **Settings → Senders & IP**
6. Add your email address (e.g., noreply@yourdomain.com)
7. Verify it (check your inbox for verification email)

### Stripe (Payments)
1. Sign up at https://stripe.com
2. Complete business verification (can take 1-2 days, but you can test immediately)
3. Go to **Developers → API keys**
4. Copy "Publishable key" (for Bolt.new - already done in Step 2)
5. Copy "Secret key" (for Supabase - we'll use this next)
6. Switch to "Test mode" if you want to test first (recommended)

## Step 4: Configure Supabase Secrets (5 minutes)

1. Go to Supabase Dashboard
2. Click **Edge Functions** in sidebar
3. Click **Settings** or **Secrets** tab
4. Add these secrets ONE BY ONE:

```bash
APP_URL = https://your-bolt-app.bolt.new
BREVO_API_KEY = xkeysib-your-key-from-brevo
EMAIL_FROM = noreply@yourdomain.com
EMAIL_FROM_NAME = LoyaltyHub
STRIPE_SECRET_KEY = sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET = whsec_temporary
```

**Note:** Use your actual Bolt.new URL for `APP_URL`

## Step 5: Deploy Edge Functions (5 minutes)

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

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

### Option B: Manual Deployment

If you don't have CLI access, you can deploy functions through the Supabase dashboard by:
1. Creating each function in the Edge Functions section
2. Copying the code from `/supabase/functions/[function-name]/index.ts`
3. Deploying each function

## Step 6: Configure Stripe Webhook (3 minutes)

1. Go to Stripe Dashboard → **Developers → Webhooks**
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Replace `YOUR-PROJECT` with your Supabase project reference
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Go back to Supabase → Edge Functions → Secrets
8. Update `STRIPE_WEBHOOK_SECRET` with the actual webhook secret

## Step 7: Test Your Deployment (5 minutes)

### Test 1: Landing Page
1. Open your Bolt.new URL
2. Verify the landing page loads with no errors
3. Check browser console (F12) - should have no red errors

### Test 2: Create Account
1. Click "Sign Up"
2. Fill in the form with test data
3. Click "Create Account"
4. You should be redirected to the dashboard
5. Check that you can see the dashboard UI

### Test 3: Verify Database
1. Go to Supabase → **Table Editor**
2. Check `auth.users` table - your test user should be there
3. Check `businesses` table - your business record should be there
4. Check `tenants` table - your tenant record should be there

### Test 4: Send Email (Optional)
1. If you're a super admin, go to `/admin/test-communications`
2. Send a test email to yourself
3. Check your inbox
4. If email arrives, email system is working!

## You're Live!

Your LoyaltyHub instance is now running in production on Bolt.new with Supabase backend.

## Next Steps

### Create Super Admin Account
```sql
-- Run this in Supabase SQL Editor
-- Replace 'your-user-id' with your actual user ID from auth.users table
INSERT INTO super_admins (id, email)
VALUES ('your-user-id', 'admin@yourdomain.com');
```

### Add SMS Provider (Optional)
If you want SMS functionality, add one of these to Supabase secrets:

**Option 1: Brevo SMS**
```bash
BREVO_SMS_SENDER = YourBrand
```
(Uses same BREVO_API_KEY as email)

**Option 2: Vonage**
```bash
VONAGE_API_KEY = your-key
VONAGE_API_SECRET = your-secret
VONAGE_FROM_NUMBER = +1234567890
```

**Option 3: Twilio**
```bash
TWILIO_ACCOUNT_SID = your-sid
TWILIO_AUTH_TOKEN = your-token
TWILIO_PHONE_NUMBER = +1234567890
```

### Configure Subscription Tiers

Go to Super Admin dashboard and:
1. Verify subscription tiers are populated
2. Add Stripe Price IDs to each tier
3. Test upgrading to a paid plan

### Set Up Monitoring

1. Bookmark your Supabase dashboard
2. Bookmark your Stripe dashboard
3. Bookmark your Brevo dashboard
4. Set up email alerts for critical errors

## Common First-Time Issues

### "Can't connect to Supabase"
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- Verify they're set in Bolt.new environment variables
- Rebuild your Bolt.new project

### "Email not sending"
- Check BREVO_API_KEY is set in Supabase secrets
- Verify EMAIL_FROM is verified in Brevo
- Check Brevo account has credits

### "Dashboard is blank"
- Check browser console for RLS policy errors
- Verify database migrations are all applied
- Check that business record was created

### "Stripe checkout doesn't work"
- Verify STRIPE_SECRET_KEY is set
- Check webhook is configured correctly
- Use test mode first (sk_test_* keys)

## Getting Help

1. Check `/PRODUCTION_DEPLOYMENT.md` for detailed instructions
2. Check `/DEPLOYMENT_CHECKLIST.md` for comprehensive checklist
3. Review Supabase Edge Function logs for errors
4. Check browser console for frontend errors

## Useful Commands

```bash
# Check if build works locally
npm run build

# Type check (will show warnings but build still works)
npm run typecheck

# Deploy a single Edge Function
supabase functions deploy function-name

# View Edge Function logs
supabase functions logs function-name
```

## Production Checklist

Before announcing your launch:

- [ ] All tests pass
- [ ] Super admin account created
- [ ] Subscription tiers configured with Stripe prices
- [ ] Email sending works
- [ ] Stripe test payment works
- [ ] No errors in Edge Function logs
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up

## Congratulations!

Your LoyaltyHub platform is now live and ready to accept real customers.

**What's Working:**
- User authentication and signup
- Dashboard and all pages
- Database with proper security (RLS)
- Email notifications via Brevo
- Stripe payment integration
- All 11 Edge Functions deployed
- Multi-tenant architecture

**Ready for Production:**
- Sign up real customers
- Create loyalty programs
- Process payments
- Send email campaigns
- Generate QR codes
- Track analytics

---

**Need more details?** Check the other deployment guides:
- `PRODUCTION_DEPLOYMENT.md` - Full deployment guide
- `SUPABASE_SECRETS_SETUP.md` - Detailed secrets documentation
- `DEPLOYMENT_CHECKLIST.md` - Complete verification checklist
