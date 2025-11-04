# SMS Configuration Guide for LoyaltyHub

This guide walks you through configuring Brevo SMS provider for your LoyaltyHub platform.

## Prerequisites

- Access to your Supabase project dashboard
- A Brevo account (sign up at https://app.brevo.com if needed)
- Super Admin access to your LoyaltyHub platform

## Step 1: Get Brevo SMS Credentials

### 1.1 Create or Access Your Brevo Account

1. Go to https://app.brevo.com
2. Sign up for a new account or log in to your existing account
3. Complete account verification if required

### 1.2 Generate API Key

1. In your Brevo dashboard, navigate to **SMTP & API** → **API Keys**
   - Direct link: https://app.brevo.com/settings/keys/api
2. Click **"Create a new API key"** or use an existing key
3. Give it a descriptive name like "LoyaltyHub SMS"
4. Ensure it has SMS permissions enabled
5. Copy the API key and save it securely (you'll need this in Step 2)

### 1.3 Configure SMS Sender

Your SMS sender can be either:

**Option A: Phone Number (Recommended for most countries)**
- Format: E.164 international format (e.g., `+12345678900`)
- Must be a verified number in your Brevo account
- Go to **SMS** → **Senders & Numbers** to verify a number

**Option B: Alphanumeric Sender ID**
- Format: 3-11 characters, letters only
- Example: `YourBrand` or `LoyaltyHub`
- May require pre-registration depending on your target countries
- Check Brevo documentation for country-specific requirements

**Save your chosen sender ID** - you'll need this in Step 2.

## Step 2: Configure Supabase Edge Function Secrets

These credentials must be added to Supabase for the SMS Edge Function to work.

### 2.1 Access Supabase Secrets

1. Log into your Supabase dashboard at https://app.supabase.com
2. Select your LoyaltyHub project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**

### 2.2 Add Required Secrets

Add the following two secrets:

**Secret 1: Brevo API Key**
- **Name:** `BREVO_API_KEY`
- **Value:** Your Brevo API key from Step 1.2

**Secret 2: Brevo SMS Sender**
- **Name:** `BREVO_SMS_SENDER`
- **Value:** Your sender ID from Step 1.3 (e.g., `+12345678900` or `YourBrand`)

### 2.3 Wait for Edge Functions to Restart

- Supabase automatically restarts Edge Functions when secrets are updated
- This usually takes 10-30 seconds
- No manual action required

## Step 3: Configure Platform Settings

### 3.1 Log into LoyaltyHub as Super Admin

1. Navigate to your LoyaltyHub platform URL
2. Log in with your Super Admin credentials

### 3.2 Access Platform Configuration

1. Open the sidebar and go to **Platform Configuration**
2. Locate the **SMS Provider Configuration** section

### 3.3 Set Primary Provider

1. Select **Brevo SMS** as your primary provider
2. Optionally configure system alerts:
   - **Alert Email:** Enter an email address to receive provider switch notifications
   - **Alert Phone:** Enter a phone number in E.164 format for SMS alerts
3. Click **Save Settings**

## Step 4: Test Your Configuration

### 4.1 Navigate to Test Communications

1. In the Super Admin sidebar, go to **Test Communications**
2. Select the **SMS Test** tab

### 4.2 Send a Test SMS

1. Enter a test recipient phone number in E.164 format (e.g., `+12345678900`)
2. Enter a test message (e.g., "Testing Brevo SMS integration")
3. Select **Brevo** as the forced provider
4. Click **Send Test SMS**

### 4.3 Verify Success

**If successful, you'll see:**
- Success message with provider information
- Message ID from Brevo
- Green status indicator

**If it fails:**
- Review the error message displayed
- Common issues:
  - API key is incorrect or expired
  - Sender ID is not verified in Brevo
  - Recipient phone number format is invalid
  - Brevo account has insufficient credits
  - Country/region restrictions in Brevo account

## Step 5: Verify Provider Status

### 5.1 Check Credential Status

1. Return to **Platform Configuration**
2. Scroll to **Brevo SMS Credentials** section
3. Verify both credentials show green checkmarks:
   - ✓ BREVO_API_KEY: Configured
   - ✓ BREVO_SMS_SENDER: Configured

### 5.2 Review Provider Health

Check the **Provider Health** section for:
- Status: Healthy (green) or Unhealthy (red)
- Last Success: Timestamp of last successful SMS
- Failure Count: Should be 0 if working correctly

## Step 6: Production Testing

### 6.1 Test Real Customer Flow

1. Navigate to **Customers** page
2. Add a test customer with a valid phone number
3. Ensure customer has **opted in to SMS**
4. Trigger a transactional SMS (e.g., welcome message)

### 6.2 Monitor Communication Logs

1. Go to **Communications** page
2. Verify the SMS appears in the logs with:
   - Status: Sent
   - Provider: brevo
   - Message ID from Brevo

## Optional: Configure Twilio Fallback Provider

For redundancy, you can configure Twilio as a fallback provider.

### Get Twilio Credentials

1. Log into https://console.twilio.com
2. From your dashboard, copy:
   - Account SID
   - Auth Token
   - Twilio Phone Number (must have SMS capabilities)

### Add Twilio Secrets to Supabase

In Supabase Edge Function Secrets, add:

1. **Name:** `TWILIO_ACCOUNT_SID` | **Value:** Your Account SID
2. **Name:** `TWILIO_AUTH_TOKEN` | **Value:** Your Auth Token
3. **Name:** `TWILIO_PHONE_NUMBER` | **Value:** Your Twilio number in E.164 format

### How Fallback Works

- If Brevo fails to send an SMS, the system automatically attempts to send via Twilio
- You'll receive an alert (if configured) when provider switching occurs
- Provider health status is tracked separately for each provider

## Troubleshooting

### "No SMS provider configured" Error

**Cause:** Supabase Edge Function secrets are not set

**Solution:**
1. Verify both `BREVO_API_KEY` and `BREVO_SMS_SENDER` are added to Supabase secrets
2. Check for typos in secret names (they are case-sensitive)
3. Wait 30 seconds for Edge Functions to restart
4. Try the test again

### "Brevo API returned 401" Error

**Cause:** Invalid or expired API key

**Solution:**
1. Generate a new API key in Brevo dashboard
2. Update the `BREVO_API_KEY` secret in Supabase
3. Wait for Edge Functions to restart
4. Test again

### "Invalid sender" Error

**Cause:** Sender ID is not verified or formatted incorrectly

**Solution:**
1. For phone numbers: Ensure E.164 format with country code (e.g., `+12345678900`)
2. For alphanumeric IDs: Verify it's approved in your Brevo account
3. Check country-specific sender ID requirements
4. Update `BREVO_SMS_SENDER` secret with correct value

### SMS Not Received

**Possible causes:**
1. Recipient phone number format is incorrect (must be E.164)
2. Customer has not opted in to SMS
3. Brevo account has insufficient SMS credits
4. Recipient's carrier is blocking the message
5. Country/region restrictions apply

**Solutions:**
1. Verify phone number format
2. Check customer opt-in status
3. Review Brevo account balance and purchase credits if needed
4. Check Brevo delivery reports for carrier rejections
5. Review Brevo country coverage and restrictions

### Provider Shows as Unhealthy

**Cause:** Recent SMS failures

**Solution:**
1. Review the "Last Error" message in Provider Health section
2. Check Brevo account status and credits
3. Verify API key is still valid
4. Send a test SMS to clear the unhealthy status once issue is resolved
5. Use the "Refresh Status" button to update provider health

## Best Practices

1. **Keep API Keys Secure**
   - Never commit API keys to version control
   - Only store them in Supabase secrets
   - Rotate keys periodically

2. **Monitor SMS Usage**
   - Keep track of Brevo account credits
   - Set up low credit alerts in Brevo
   - Review monthly SMS usage in platform analytics

3. **Test Regularly**
   - Perform test SMS sends weekly
   - Verify provider health status
   - Test fallback to Twilio occasionally

4. **Customer Opt-In**
   - Always respect SMS opt-in preferences
   - Include clear opt-out instructions in messages
   - Comply with regional SMS regulations (TCPA, GDPR, etc.)

5. **Message Content**
   - Keep messages concise (160 characters for single segment)
   - Include business name for identification
   - Avoid spam trigger words
   - Test messages for special character handling

## Support Resources

- **Brevo Documentation:** https://developers.brevo.com/docs
- **Brevo SMS API Reference:** https://developers.brevo.com/reference/sendasynctransactionalsms
- **Brevo Support:** https://help.brevo.com
- **Twilio Documentation:** https://www.twilio.com/docs/sms
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

## Summary

Once configured, your LoyaltyHub platform will:

✓ Send transactional SMS messages via Brevo
✓ Automatically fall back to Twilio if Brevo fails
✓ Track provider health and status
✓ Log all SMS communications with provider details
✓ Alert administrators of provider issues
✓ Respect customer SMS opt-in preferences
✓ Monitor SMS usage against subscription quotas

Your SMS infrastructure is production-ready!
