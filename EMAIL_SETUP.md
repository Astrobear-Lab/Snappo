# Email Notification Setup (Resend)

This guide walks you through setting up email notifications for Snappo using Resend.

## Why Resend?

- ✅ **Free tier**: 100 emails/day, 3,000/month
- ✅ **Developer-friendly**: Simple API, excellent documentation
- ✅ **High deliverability**: Built-in SPF/DKIM, low spam rate
- ✅ **Fast setup**: Get started in 5 minutes

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email or GitHub
3. Verify your email address

## Step 2: Get API Key

1. In Resend Dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Snappo Production`
4. Select permission: **Sending access**
5. Click **Add**
6. **Copy the API key** (starts with `re_...`)
   - ⚠️ You won't be able to see it again!

## Step 3: Add API Key to Supabase

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions**
4. Scroll to **Secrets**
5. Click **Add new secret**
6. Add:
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
7. Click **Save**

### Option B: Via Supabase CLI

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Verify Domain (Optional but Recommended)

Without domain verification, emails are sent from `onboarding@resend.dev` which may go to spam.

### Add Your Domain

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `snappo.app` (or your custom domain)
4. Click **Add**

### Add DNS Records

Resend will show you 3 DNS records to add:

**SPF Record** (for email authentication):
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Record** (for email signing):
```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]
```

**DMARC Record** (for spam protection):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@snappo.app
```

### Where to Add DNS Records

- **Vercel**: Project Settings → Domains → DNS Records
- **Cloudflare**: DNS → Records
- **Namecheap**: Domain List → Manage → Advanced DNS

### Verify Domain

1. After adding DNS records, wait 5-10 minutes
2. In Resend Dashboard, click **Verify** next to your domain
3. Status should change to **Verified** ✅

## Step 5: Update Email "From" Address

Once domain is verified, update the Edge Function:

**File**: `supabase/functions/send-email-notification/index.ts`

Change line 204:
```typescript
from: 'Snappo <noreply@snappo.app>',  // Replace with your domain
```

To your verified domain:
```typescript
from: 'Snappo <noreply@yourdomain.com>',
```

## Step 6: Deploy Edge Functions

Deploy the updated functions to Supabase:

```bash
# Deploy email notification function
supabase functions deploy send-email-notification

# Deploy email collection function
supabase functions deploy save-customer-email
```

## Step 7: Update Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Add email columns to photo_codes table
ALTER TABLE photo_codes
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS email_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;
```

## Step 8: Test Email Flow

### Test Email Collection

1. Visit a photo code page: `https://snappo.vercel.app/photo/ABC123`
2. Enter your email in the modal
3. Click **📧 Notify Me When Ready**
4. Check database:
   ```sql
   SELECT customer_email, email_collected_at
   FROM photo_codes
   WHERE code = 'ABC123';
   ```

### Test Email Notification

1. Upload photos to a code with email collected
2. Check Supabase Edge Functions logs:
   ```bash
   supabase functions logs send-email-notification
   ```
3. Look for: `Email sent successfully via Resend: [email_id]`
4. Check your inbox for the notification email

### Test in Mock Mode (No API Key)

If you haven't added the API key yet:
- System works in **MOCK MODE**
- Emails aren't actually sent
- `email_sent` is still marked `true` in database
- Logs show: `Email sending mocked (Resend API key not configured)`

## Troubleshooting

### Emails Going to Spam

**Solution**:
1. Verify your domain (Step 4)
2. Add all 3 DNS records (SPF, DKIM, DMARC)
3. Start with low volume (10-20 emails/day)
4. Gradually increase over 2-3 weeks (email warm-up)

### "Resend error: Domain not verified"

**Solution**:
- Use `onboarding@resend.dev` (default) until domain is verified
- Or complete domain verification (Step 4)

### Edge Function Timeout

**Solution**:
- Check Resend API status: [status.resend.com](https://status.resend.com)
- Verify API key is correct
- Check Supabase logs for detailed error

### Email Not Received

**Check**:
1. Spam/Junk folder
2. Email address is correct in database
3. Resend Dashboard → **Emails** tab for delivery status
4. Edge Function logs for errors

## Monitoring & Limits

### Resend Free Tier Limits

- **100 emails/day**
- **3,000 emails/month**
- If exceeded, emails will fail until next day/month

### Monitor Usage

1. Resend Dashboard → **Analytics**
2. See sent, delivered, bounced, and complained emails
3. Set up alerts when approaching limits

### Upgrade to Pro

If you need more:
- **Pro Plan**: $20/month for 50,000 emails
- **Scale Plan**: Custom pricing for higher volume

## Email Template Customization

Edit the HTML template in `send-email-notification/index.ts` (lines 87-152):

```typescript
const htmlContent = `
  <!DOCTYPE html>
  <html>
    <!-- Customize your email design here -->
  </html>
`
```

## Testing Tools

### Test Email Preview

Use [Resend Email Previewer](https://resend.com/emails) to see how your email looks before sending.

### Test Spam Score

Use [Mail Tester](https://www.mail-tester.com):
1. Send a test email to the provided address
2. Get a spam score (aim for 8+/10)

## Next Steps

- [ ] Create Resend account
- [ ] Get API key
- [ ] Add to Supabase secrets
- [ ] Deploy Edge Functions
- [ ] Test email flow
- [ ] (Optional) Verify custom domain
- [ ] Monitor first emails for spam

---

**Questions?** Check [Resend Documentation](https://resend.com/docs) or open an issue.
