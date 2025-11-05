# LoyaltyHub Production Deployment Checklist

Use this checklist to ensure your production deployment is complete and correctly configured.

## Pre-Deployment Checklist

### 1. Bolt.new Environment Variables
- [ ] VITE_SUPABASE_URL is set
- [ ] VITE_SUPABASE_ANON_KEY is set
- [ ] VITE_STRIPE_PUBLISHABLE_KEY is set
- [ ] All variables are using PRODUCTION values (not test/dev)

### 2. Supabase Database Setup
- [ ] Project created on Supabase
- [ ] Database migrations applied (all 26+ migrations)
- [ ] RLS policies are enabled on all tables
- [ ] Subscription tiers table is populated
- [ ] Test query works from SQL editor

### 3. Supabase Edge Function Secrets
**Minimum Required:**
- [ ] APP_URL (your Bolt.new URL)
- [ ] BREVO_API_KEY
- [ ] EMAIL_FROM
- [ ] EMAIL_FROM_NAME
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET

**Optional but Recommended:**
- [ ] BREVO_SMS_SENDER (for SMS via Brevo)
- [ ] VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM_NUMBER (SMS alternative)
- [ ] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (SMS fallback)

### 4. Supabase Edge Functions Deployed
- [ ] create-checkout-session
- [ ] create-portal-session
- [ ] fetch-brevo-balance
- [ ] send-phone-verification
- [ ] send-system-alert
- [ ] send-team-invitation
- [ ] send-transactional-email
- [ ] send-transactional-sms
- [ ] send-welcome-verification
- [ ] stripe-webhook
- [ ] track-email-open

### 5. External Service Configuration

**Brevo:**
- [ ] Account created
- [ ] API key generated
- [ ] Sender email verified
- [ ] SMS sender configured (optional)
- [ ] Account has credits

**Stripe:**
- [ ] Account created
- [ ] Production keys obtained (pk_live_*, sk_live_*)
- [ ] Webhook endpoint added
- [ ] Webhook secret copied
- [ ] Test mode disabled (using live keys)
- [ ] Products created for subscription tiers

**Vonage (optional):**
- [ ] Account created
- [ ] API credentials obtained
- [ ] Phone number or sender ID configured

## Post-Deployment Testing

### 1. Frontend Testing
- [ ] Landing page loads without errors
- [ ] Console shows no errors related to Supabase connection
- [ ] Can navigate to login page
- [ ] Can navigate to signup page

### 2. Authentication Testing
- [ ] Can create new account
- [ ] User record appears in Supabase Auth users table
- [ ] Business record created in businesses table
- [ ] Tenant record created in tenants table
- [ ] Can log in with created account
- [ ] Dashboard loads after login
- [ ] Can log out successfully

### 3. Database Access Testing
- [ ] Dashboard displays user's business data
- [ ] Can navigate to all menu items (Customers, Programs, etc.)
- [ ] No RLS policy errors in browser console
- [ ] Data isolation is working (can only see own data)

### 4. Email Testing
- [ ] Navigate to Super Admin → Test Communications (if super admin)
- [ ] Send test email
- [ ] Email is received
- [ ] Email content renders correctly
- [ ] Check communication_logs table for record

### 5. SMS Testing (if configured)
- [ ] Navigate to Super Admin → Test Communications
- [ ] Send test SMS
- [ ] SMS is received
- [ ] Check communication_logs table for record

### 6. Stripe Integration Testing
- [ ] Navigate to Subscription page
- [ ] Click to upgrade plan
- [ ] Checkout session creates successfully
- [ ] Complete test payment (use Stripe test card: 4242 4242 4242 4242)
- [ ] Webhook receives event
- [ ] Subscription updates in database
- [ ] Can access Stripe customer portal

### 7. Core Features Testing
- [ ] Can add a customer manually
- [ ] Can create a loyalty program
- [ ] Can generate QR code
- [ ] Can view analytics dashboard
- [ ] Can create email template
- [ ] Can create SMS template

## Security Verification

### Frontend Security
- [ ] No secret keys visible in browser DevTools
- [ ] No secret keys in JavaScript bundles (check dist/ files)
- [ ] Environment variables only include VITE_* prefixed public keys
- [ ] .env file is in .gitignore

### Backend Security
- [ ] All Edge Function secrets are set in Supabase (not in frontend)
- [ ] RLS is enabled on ALL database tables
- [ ] RLS policies restrict data access properly
- [ ] Webhook endpoints verify signatures
- [ ] Rate limiting is active for verification endpoints

### API Key Security
- [ ] Using production keys (not test keys) for production
- [ ] Stripe webhook uses production webhook secret
- [ ] Brevo sender email is verified
- [ ] No API keys committed to git repository

## Monitoring Setup

### Supabase Monitoring
- [ ] Edge Function logs are accessible
- [ ] Database logs are enabled
- [ ] Error tracking is configured
- [ ] Set up alerts for critical errors

### External Service Monitoring
- [ ] Brevo account balance monitoring set up
- [ ] Stripe dashboard bookmarked for payment monitoring
- [ ] SMS provider balance alerts configured

### Application Monitoring
- [ ] Super Admin dashboard accessible
- [ ] Communication logs table tracking sends
- [ ] Verification attempts table logging properly
- [ ] Can view platform metrics

## Create Super Admin Account

- [ ] Signed up for regular account
- [ ] Obtained user ID from auth.users table
- [ ] Added record to super_admins table:
```sql
INSERT INTO super_admins (id, email)
VALUES ('user-uuid-here', 'admin@yourdomain.com');
```
- [ ] Verified super admin access by visiting /admin/dashboard

## Performance Optimization

- [ ] Build completed successfully (`npm run build`)
- [ ] Bundle size is acceptable (under 1MB total)
- [ ] Code splitting is working (separate vendor chunks)
- [ ] No console errors in production build
- [ ] Images are optimized (if any)
- [ ] Font loading is optimized

## Final Verification

### Domain and URLs
- [ ] Production URL is accessible
- [ ] HTTPS is working (SSL certificate)
- [ ] APP_URL in Supabase secrets matches production domain
- [ ] Stripe webhook URL matches production domain
- [ ] No mixed content warnings

### User Experience
- [ ] Page loads within 3 seconds
- [ ] No broken images or styles
- [ ] Mobile responsive design works
- [ ] All navigation links work
- [ ] Forms submit correctly
- [ ] Error messages are user-friendly

### Business Logic
- [ ] Onboarding flow works (currently auto-verified)
- [ ] Subscription tiers enforce limits correctly
- [ ] SMS/Email allowances are tracked
- [ ] Team invitations work
- [ ] Customer portal login works

## Documentation

- [ ] README.md is up to date
- [ ] PRODUCTION_DEPLOYMENT.md reviewed
- [ ] SUPABASE_SECRETS_SETUP.md reviewed
- [ ] Team members have access to necessary accounts
- [ ] Support email configured (admin@adaptiq.no or similar)

## Backup and Recovery

- [ ] Supabase automatic backups enabled
- [ ] Point-in-time recovery configured
- [ ] Database connection string saved securely
- [ ] Environment variables documented
- [ ] Recovery procedure documented

## Launch Readiness

- [ ] All above checklists completed
- [ ] No critical errors in logs
- [ ] Test accounts created and verified
- [ ] Support process in place
- [ ] Monitoring is active
- [ ] Team is ready for launch

## Post-Launch Monitoring (First 24 Hours)

- [ ] Check Edge Function logs for errors
- [ ] Monitor Brevo/Stripe for usage spikes
- [ ] Review user signups in database
- [ ] Check for RLS policy issues
- [ ] Monitor communication delivery rates
- [ ] Review error logs
- [ ] Check webhook delivery success rate

## Troubleshooting Reference

**If users can't sign up:**
- Check Supabase Auth is enabled
- Verify RLS policies allow inserts
- Check Edge Function logs

**If emails don't send:**
- Verify BREVO_API_KEY is set
- Check EMAIL_FROM is verified
- Review Brevo account credits

**If SMS don't send:**
- Check at least one SMS provider is configured
- Verify phone numbers are E.164 format
- Check provider account credits

**If Stripe checkout fails:**
- Verify STRIPE_SECRET_KEY is production key
- Check webhook endpoint is correct
- Review Stripe dashboard logs

**If dashboard won't load:**
- Check browser console for errors
- Verify RLS policies
- Check businesses table has record for user

## Support Contacts

- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com
- Brevo Support: https://help.brevo.com
- Vonage Support: https://www.vonage.com/support

## Completed By

- [ ] Name: _________________
- [ ] Date: _________________
- [ ] Production URL: _________________
- [ ] Verified by: _________________

---

**Remember:** Keep this checklist handy for future deployments or when debugging production issues.
