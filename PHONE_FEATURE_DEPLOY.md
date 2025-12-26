# Phone Number Collection Feature - Deployment Guide

## 📋 Overview

This feature allows customers to enter their phone number when scanning a QR code, and receive an SMS notification when their photos are uploaded.

## 🚀 Deployment Steps

### 1. Deploy Edge Functions

Deploy the two new Edge Functions to Supabase:

```bash
# Deploy phone save function
supabase functions deploy save-customer-phone

# Deploy SMS notification function
supabase functions deploy send-photo-notification

# Verify deployment
supabase functions list
```

### 2. Update Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Add phone-related columns to photo_codes table
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS phone_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP WITH TIME ZONE;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'photo_codes'
AND column_name IN ('customer_phone', 'phone_collected_at', 'sms_sent', 'sms_sent_at');
```

### 3. Configure Supabase Secrets

Add Twilio credentials via Supabase CLI or Dashboard:

```bash
# Twilio credentials (for SMS)
supabase secrets set TWILIO_ACCOUNT_SID=AC1234567890abcdef...
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890

# App URL (for SMS links)
supabase secrets set APP_URL=https://your-app.vercel.app

# Verify secrets (won't show values, but confirms they exist)
supabase secrets list
```

**Dashboard Method:**
1. Go to Supabase Dashboard → Settings → Edge Functions
2. Click "Add secret"
3. Add each secret: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, APP_URL

### 4. Test the Feature

#### Test Phone Collection

1. Generate a new code in photographer dashboard
2. Copy the QR code link
3. Open in browser (or scan with phone)
4. You should see phone input form
5. Enter a test phone number (your own)
6. Click "Notify Me When Ready"
7. Verify in database:

```sql
SELECT code, customer_phone, phone_collected_at
FROM photo_codes
WHERE customer_phone IS NOT NULL
ORDER BY phone_collected_at DESC
LIMIT 5;
```

#### Test SMS Sending

1. Upload photos to the code you created
2. Check Edge Function logs:

```bash
supabase functions logs send-photo-notification --project-ref your-project-ref
```

3. Check your phone for SMS
4. Verify in database:

```sql
SELECT code, customer_phone, sms_sent, sms_sent_at
FROM photo_codes
WHERE sms_sent = true
ORDER BY sms_sent_at DESC
LIMIT 5;
```

### 5. Troubleshooting

#### SMS not sending

**Check 1: Edge Function logs**
```bash
supabase functions logs send-photo-notification
```

**Check 2: Verify Twilio credentials**
```bash
# Test Twilio API directly
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "From=YOUR_TWILIO_NUMBER" \
  --data-urlencode "Body=Test message" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

**Check 3: Phone number format**
- Must be E.164 format: `+15551234567`
- Country code is required

#### Phone save failing

**Check Edge Function logs:**
```bash
supabase functions logs save-customer-phone
```

**Common issues:**
- Invalid phone number format (must be E.164)
- Database columns not created
- Service role key not configured

## 📱 Phone Number Formats

The app supports automatic formatting for:

- 🇺🇸 US/Canada: `(555) 123-4567`
- 🇰🇷 Korea: `010-1234-5678`
- 🇬🇧 UK: `020 1234 5678`
- 🇯🇵 Japan: `090-1234-5678`
- 🇨🇳 China: `138 0013 8000`
- And 15 more countries...

**Storage format:** `+15551234567` (E.164)
**Display format:** `+1 (555) 123-4567` (formatted)

## 💰 Cost Estimates

### Twilio SMS Costs

- **US/Canada:** ~$0.0079 per message (~9원)
- **Korea:** ~$0.055 per message (~70원)
- **Trial Account:** $15.50 free credits (~2,000 US messages)

### Edge Function Costs

Supabase Edge Functions:
- **500,000 invocations/month:** Free
- After that: $2 per million invocations

Expected invocations per photo upload:
- `save-customer-phone`: 1 call (when phone is entered)
- `send-photo-notification`: 1 call (when photos uploaded)

**Total:** 2 invocations per transaction (well within free tier)

## 🔒 Security Notes

1. **Edge Functions use Service Role Key**
   - Bypasses RLS for phone number updates
   - Only exposed via Edge Functions (server-side)
   - Not accessible from client

2. **Phone Number Privacy**
   - Stored in database with RLS protection
   - Only photographer and system can access
   - Not shared with third parties

3. **SMS Security**
   - Twilio credentials stored as Supabase secrets
   - Never exposed to client
   - All SMS operations server-side

## 📄 Files Changed

- `supabase/schema.sql` - Database schema updates
- `supabase/functions/save-customer-phone/index.ts` - Phone save Edge Function
- `supabase/functions/send-photo-notification/index.ts` - SMS Edge Function
- `src/pages/PhotoView.jsx` - Phone input UI and logic
- `src/components/photographer/UploadMatchPanel.jsx` - SMS trigger on upload

## ✅ Deployment Checklist

- [ ] Database schema updated (phone fields added to photo_codes)
- [ ] Edge Functions deployed (`save-customer-phone`, `send-photo-notification`)
- [ ] Twilio credentials configured in Supabase secrets (ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER)
- [ ] APP_URL configured in Supabase secrets
- [ ] Test phone collection (enter phone number)
- [ ] Test SMS sending (upload photos)
- [ ] Verify Edge Function logs (no errors)
- [ ] Verify database records (phone saved, SMS sent)

## 🆘 Support

If you encounter issues:

1. Check Edge Function logs
2. Verify Supabase secrets are set
3. Test Twilio credentials directly
4. Check database for phone records
5. Review [SMS_SETUP.md](SMS_SETUP.md) for detailed Twilio setup

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Phone input appears when scanning QR code
2. ✅ Phone number saves to database
3. ✅ SMS is sent when photos are uploaded
4. ✅ Customer receives SMS with link
5. ✅ Link opens to photo page with photos visible
