# Quick SMS Setup - Brevo Configuration

## 1. Get Brevo Credentials (5 minutes)

**Get API Key:**
1. Visit https://app.brevo.com/settings/keys/api
2. Create new API key or copy existing
3. Save the key securely

**Set Sender ID:**
- Phone: `+12345678900` (E.164 format, must be verified)
- OR Alphanumeric: `YourBrand` (3-11 letters)

## 2. Add to Supabase Secrets (2 minutes)

1. Open https://app.supabase.com → Your Project
2. Go to **Project Settings → Edge Functions → Secrets**
3. Add two secrets:

```
Name: BREVO_API_KEY
Value: [Your Brevo API Key]

Name: BREVO_SMS_SENDER
Value: [Your Phone Number or Sender ID]
```

4. Wait 30 seconds for restart

## 3. Configure in Platform (1 minute)

1. Login as Super Admin
2. Go to **Platform Configuration**
3. Select **Brevo** as primary provider
4. Click **Save Settings**

## 4. Test (1 minute)

1. Go to **Test Communications** → **SMS Test**
2. Enter phone: `+1234567890`
3. Enter message: `Test message`
4. Force provider: **Brevo**
5. Click **Send Test SMS**

## Done!

✓ Check green status in Platform Configuration
✓ SMS functionality is now active
✓ All transactional messages will use Brevo

---

## Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "No provider configured" | Add secrets to Supabase, wait 30s |
| "401 Unauthorized" | Check API key is correct |
| "Invalid sender" | Verify sender in Brevo account |
| Not received | Check E.164 format: `+` country code + number |

## Need Fallback? Add Twilio (Optional)

Add three more Supabase secrets:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

System auto-switches if Brevo fails.
