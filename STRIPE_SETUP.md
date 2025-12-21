# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment integration for Snappo and test it in development mode.

## 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up for a free Stripe account
3. Complete the registration process

## 2. Get Your API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on **Developers** in the top right
3. Go to **API keys** section
4. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_...`) - Safe to use in frontend
   - **Secret key** (starts with `sk_test_...`) - Must be kept private

## 3. Configure Environment Variables

### Frontend (.env file)

Create or update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Add Stripe publishable key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...your-key-here
```

### Supabase Edge Function

You need to add the Stripe Secret Key to Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Add a new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_51...your-secret-key`

## 4. Deploy the Supabase Edge Function

Install Supabase CLI if you haven't already:

```bash
npm install -g supabase
```

Login to Supabase:

```bash
supabase login
```

Link your project:

```bash
supabase link --project-ref your-project-ref
```

Deploy the Edge Function:

```bash
supabase functions deploy create-payment-intent
```

Set the secret (alternative method if dashboard doesn't work):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_51...your-secret-key
```

## 5. Enable CORS for Edge Function

The Edge Function already includes CORS headers, but make sure your Supabase project allows requests from your domain:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Under **CORS**, add your development URL: `http://localhost:5173`
3. For production, add your Vercel URL

## 6. Testing Payment Flow

### Test Credit Cards

Stripe provides test card numbers that you can use in **Test Mode**:

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| `4242 4242 4242 4242` | Visa | Payment succeeds |
| `4000 0025 0000 3155` | Visa (3D Secure) | Requires authentication |
| `4000 0000 0000 9995` | Visa | Payment fails (insufficient funds) |

**Other test details:**
- **Expiry Date**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP Code**: Any 5 digits (e.g., `12345`)

### Supported Payment Methods

The payment integration supports the following methods:

1. **Card** (Visa, Mastercard, American Express, etc.)
   - Available on all browsers
   - Most common payment method

2. **Apple Pay**
   - Only available on Safari browser with Apple devices
   - Requires saved cards in Apple Wallet

3. **Google Pay**
   - Only available on Chrome browser with Google Pay set up
   - Requires saved cards in Google account

4. **PayPal**
   - Available on all browsers
   - Redirects to PayPal.com for authentication, then returns to your site
   - Requires PayPal account

**Note:** Payment method availability depends on browser, device, and user setup. Not all methods will appear for all users.

### Test the Payment

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to a photo page (e.g., `/photo/ABC123`)

3. Click the "🔓 Unlock All Photos $3" button

4. A payment modal should appear with Stripe Elements

5. Enter test card details:
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

6. Click "Pay $3.00"

7. Payment should process and download should start automatically

## 7. Verify Payment in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on **Payments** in the left sidebar
3. You should see your test payment listed
4. Click on it to see details including metadata (photoCodeId, buyerId, etc.)

## 8. Switch Between Mock and Real Payment

In [src/pages/PhotoView.jsx](src/pages/PhotoView.jsx), line 30:

```javascript
// Mock payment mode (true = 실제 결제 없이 테스트, false = Stripe 실제 결제)
const MOCK_PAYMENT = false;  // Change to true for mock mode
```

- `MOCK_PAYMENT = true`: Simulates payment without Stripe (no API calls)
- `MOCK_PAYMENT = false`: Uses real Stripe integration (requires setup)

## 9. Production Deployment

When deploying to production:

1. **Get Live API Keys**:
   - Switch to "Live mode" in Stripe Dashboard
   - Copy the live publishable key (`pk_live_...`)
   - Copy the live secret key (`sk_live_...`)

2. **Update Vercel Environment Variables**:
   - Add `VITE_STRIPE_PUBLISHABLE_KEY` with live key

3. **Update Supabase Secrets**:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...your-live-key
   ```

4. **Complete Stripe Onboarding**:
   - Provide business information
   - Add bank account for payouts
   - Activate your account

## 10. Troubleshooting

### "Failed to initialize payment"
- Check if Edge Function is deployed: `supabase functions list`
- Verify `STRIPE_SECRET_KEY` is set in Supabase secrets
- Check Edge Function logs: `supabase functions logs create-payment-intent`

### Payment modal doesn't open
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`
- Make sure you've restarted the dev server after adding env variables

### "new row violates row-level security policy for table transactions"
- Run this SQL in Supabase SQL Editor:
  ```sql
  CREATE POLICY "Authenticated users can create transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (
      auth.role() = 'authenticated' AND
      auth.uid() = buyer_id
    );
  ```

### CORS errors
- Ensure Edge Function has CORS headers (already included)
- Add your domain to Supabase CORS settings

## Support

For more information:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
