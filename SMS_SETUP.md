# SMS Notification Setup Guide

This guide explains how to set up SMS notifications for photo upload alerts using Twilio.

## Overview

When photographers upload photos, customers who provided their phone numbers receive an automatic SMS notification with a link to view and purchase their photos.

## How It Works

1. **Customer visits QR code link** → Enters phone number to get notified
2. **Photographer uploads photos** → System sends SMS automatically
3. **Customer receives text** → Clicks link to view photos

## Prerequisites

- Twilio account ([sign up here](https://www.twilio.com/try-twilio))
- Supabase project with Edge Functions enabled

## Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Account → API keys & tokens**
3. Copy the following:
   - **Account SID** (e.g., `AC1234567890abcdef...`)
   - **Auth Token** (click "View" to reveal)

4. Get a phone number:
   - Go to **Phone Numbers → Manage → Buy a number**
   - Choose a number with SMS capabilities
   - Copy the phone number (e.g., `+1234567890`)

## Step 2: Configure Supabase Secrets

Add the following secrets to your Supabase project:

### Option A: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set TWILIO_ACCOUNT_SID=AC1234567890abcdef...
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
supabase secrets set APP_URL=https://your-app.vercel.app
```

### Option B: Using Supabase Dashboard

1. Go to **Supabase Dashboard → Settings → Edge Functions**
2. Click **Add secret**
3. Add each secret:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `APP_URL` (your production URL, e.g., `https://your-app.vercel.app`)

## Step 3: Deploy Edge Function

Deploy the SMS notification function:

```bash
# Deploy the function
supabase functions deploy send-photo-notification

# Verify deployment
supabase functions list
```

## Step 4: Update Database Schema

Run the updated schema in Supabase SQL Editor:

```sql
-- Add phone collection fields to photo_codes table
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS phone_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP WITH TIME ZONE;
```

## Testing

### Test Phone Collection

1. Generate a new code in the photographer dashboard
2. Copy the QR code link
3. Open in browser (or scan with phone)
4. You should see a phone number input modal
5. Enter a test phone number (use your own for testing)
6. Click "Notify Me When Ready"

### Test SMS Sending

1. Upload photos to the code you created
2. Check the console logs - you should see:
   ```
   [UploadMatchPanel] SMS notification sent successfully to: +1234567890
   ```
3. Check your phone for the SMS

### Check Database

```sql
-- Verify phone was saved
SELECT code, customer_phone, phone_collected_at, sms_sent, sms_sent_at
FROM photo_codes
WHERE customer_phone IS NOT NULL;
```

## Troubleshooting

### SMS not sending

**Check 1: Verify Twilio credentials**
```bash
# Test Twilio API directly
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "From=YOUR_TWILIO_NUMBER" \
  --data-urlencode "Body=Test message" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

**Check 2: Verify Edge Function logs**
```bash
# View function logs
supabase functions logs send-photo-notification --project-ref your-project-ref
```

**Check 3: Check Supabase secrets**
```bash
# List secrets (won't show values, but confirms they exist)
supabase secrets list
```

### Phone number format

Twilio requires E.164 format:
- ✅ Correct: `+1234567890`, `+821012345678`
- ❌ Wrong: `123-456-7890`, `(123) 456-7890`

The app validates phone numbers but doesn't enforce E.164. Consider adding stricter validation for production.

### SMS already sent

The system prevents duplicate SMS sends. If you need to resend:

```sql
-- Reset SMS sent flag for a specific code
UPDATE photo_codes
SET sms_sent = FALSE, sms_sent_at = NULL
WHERE code = 'ABC123';
```

## Cost Considerations

### Twilio Pricing (as of 2024)

- **SMS (US/Canada)**: ~$0.0079 per message
- **SMS (International)**: Varies by country, typically $0.02-$0.10 per message
- **Phone number rental**: ~$1.15/month

### Free Tier

Twilio trial accounts include:
- $15.50 in free credits
- Can send ~2,000 messages (US)
- Trial numbers show "Sent from Twilio trial account" prefix

### Production Recommendations

1. **Upgrade Twilio account** to remove trial restrictions
2. **Monitor usage** in Twilio Console → Monitor → Usage
3. **Set up alerts** for high usage
4. **Consider alternative providers** (e.g., AWS SNS, SendGrid) for lower costs

## Message Customization

Edit the message in [supabase/functions/send-photo-notification/index.ts](supabase/functions/send-photo-notification/index.ts):

```typescript
const message = `📸 Your ${photoCount} photo${photoCount > 1 ? 's are' : ' is'} ready! View and download: ${photoUrl}`
```

### Message Limits

- **SMS**: 160 characters per segment
- **Messages over 160 chars**: Split into multiple segments (charged per segment)
- **Current message**: ~50-80 characters (1 segment)

## Security

### Phone Number Privacy

- Phone numbers are stored in `photo_codes.customer_phone`
- Only accessible to:
  - Photographer (via RLS policies)
  - Edge Functions (via service role key)
- Not visible to other users

### Best Practices

1. **Don't log phone numbers** in production
2. **Use HTTPS** for all API calls (already configured)
3. **Rotate Twilio Auth Token** periodically
4. **Monitor for abuse** (rate limiting recommended for production)

## Production Checklist

Before going live:

- [ ] Upgrade Twilio account (remove trial restrictions)
- [ ] Set up billing alerts in Twilio
- [ ] Update `APP_URL` to production domain
- [ ] Test SMS on real devices
- [ ] Add phone number formatting/validation
- [ ] Consider adding opt-out mechanism (legal requirement in some regions)
- [ ] Review Twilio compliance requirements for your region

## Support

- **Twilio Support**: https://support.twilio.com/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **SMS Regulations**: Check local laws (TCPA in US, GDPR in EU, etc.)
