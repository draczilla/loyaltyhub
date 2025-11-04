# Beta Onboarding Setup Guide

## Overview
This document explains how to configure the email and phone verification system for tenant onboarding.

## Current Status
✅ Database migrations applied
✅ Edge functions deployed
✅ Frontend pages created
⚠️ Environment variables need configuration

## Required Configuration

### 1. Supabase Edge Function Secrets

You need to set the `APP_URL` environment variable in your Supabase project:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ybpgfkieomtsftbuadba
2. Navigate to **Edge Functions** → **Settings** (or **Project Settings** → **Edge Functions**)
3. Add the following secret:

```
APP_URL=https://your-actual-domain.com
```

Replace `https://your-actual-domain.com` with your actual deployed application URL (e.g., Netlify, Vercel, or custom domain).

**To set this via Supabase CLI (if available):**
```bash
supabase secrets set APP_URL=https://your-actual-domain.com
```

### 2. Configure Brevo Sender Email

The welcome verification email currently uses `noreply@yourdomain.com` as the sender. You should:

1. **Option A: Use a verified Brevo domain**
   - Add and verify your domain in Brevo
   - Update the sender email in `/supabase/functions/send-welcome-verification/index.ts` line 181

2. **Option B: Use the default Brevo sender**
   - Check your Brevo account for approved sender emails
   - Use one of those emails instead

**Current sender configuration (line 179-182):**
```typescript
sender: {
  name: "Loyalty Platform",
  email: "noreply@yourdomain.com",  // ← Update this
},
```

**Recommended change:**
```typescript
sender: {
  name: "AdaptiQ Loyalty Platform",
  email: "noreply@adaptiq.no",  // Use your verified domain
},
```

### 3. Test Email for admin@adaptiq.no

To test the verification flow:

1. Create a new tenant account with email: `admin@adaptiq.no`
2. Check spam folder if email doesn't arrive
3. Verify the email contains a working verification link
4. Complete phone verification step

## How the Flow Works

### Signup Process
1. User signs up → Account created in `pending_email` status
2. User sees "Check Your Email" page with instructions
3. Welcome email sent with 24-hour verification token
4. User clicks link → Email verified → Status changes to `pending_phone`
5. User enters phone number → SMS sent with 15-minute verification token
6. User clicks SMS link → Phone verified → Status changes to `completed`
7. User can now access dashboard

### Security Features
- Tokens are SHA-256 hashed in database
- Rate limiting: 3 attempts per hour per identifier
- Email verification expires in 24 hours
- SMS verification expires in 15 minutes
- Tokens are single-use only
- All attempts logged in `verification_attempts` table

## Verification URLs

The edge functions generate these URLs:
- Email: `${APP_URL}/verify-email?token=${token}`
- SMS: `${APP_URL}/verify-phone?token=${token}`

## Database Tables

### businesses (new fields)
- `email_verified` - boolean
- `phone` - text
- `phone_verified` - boolean
- `email_verification_token` - text (hashed)
- `email_verification_expires` - timestamptz
- `phone_verification_token` - text (hashed)
- `phone_verification_expires` - timestamptz
- `onboarding_status` - text (pending_email, pending_phone, completed)
- `onboarding_completed_at` - timestamptz

### verification_attempts
Tracks all verification attempts for security and rate limiting.

## Troubleshooting

### "Invalid verification link" Error
**Cause:** User was redirected to `/verify-email` without a token
**Fix:** Ensure APP_URL is set correctly and email is actually being sent

### Email Not Received
**Check:**
1. Brevo account has credits
2. Sender email is verified in Brevo
3. Check spam folder
4. Check `verification_attempts` table for send status
5. Check edge function logs in Supabase

### SMS Not Received
**Check:**
1. Brevo SMS credits available
2. Phone number format is correct (international format)
3. Check `communication_logs` table for send status

## Manual Testing

### Test the welcome email endpoint directly:
```bash
curl -X POST \
  https://ybpgfkieomtsftbuadba.supabase.co/functions/v1/send-welcome-verification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "user-uuid-here",
    "email": "admin@adaptiq.no",
    "companyName": "Test Company",
    "tierName": "Free"
  }'
```

## Next Steps

1. ✅ Set `APP_URL` in Supabase Edge Function secrets
2. ✅ Update sender email in `send-welcome-verification` function
3. ✅ Redeploy the edge function after updating sender email
4. ✅ Test signup flow with admin@adaptiq.no
5. ✅ Verify email arrives and link works
6. ✅ Test phone verification with real phone number
7. ✅ Check database to confirm onboarding_status updates

## Support

If you encounter issues:
- Check edge function logs in Supabase Dashboard
- Check `verification_attempts` table for rate limiting
- Check `communication_logs` table for email/SMS send status
- Ensure Brevo account has sufficient credits
- Verify all environment variables are set correctly
