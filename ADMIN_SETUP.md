# Admin Setup Guide

This guide explains how to set up admin accounts that can use test payments instead of live Stripe payments.

## Overview

Admin accounts have the following privileges:
- **Test Payment Mode**: Payments are simulated without actual Stripe charges
- **Live Database**: Test payments still create transaction records and unlock photos
- **Admin Badge**: UI shows a purple "Admin Mode Active" badge during checkout

Regular users will continue to use real Stripe payments.

## Setting Up an Admin Account

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Table Editor** → **profiles**
4. Find the user you want to make admin (search by email)
5. Edit the row and set `is_admin` to `TRUE`
6. Save the changes

### Method 2: Using SQL Editor

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace with actual email):

```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'your-admin-email@example.com';
```

3. Execute the query

### Method 3: Using Supabase CLI

```bash
# Connect to your remote database
supabase db remote --db-url "your-database-url"

# Run the SQL command
psql "your-database-url" -c "UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';"
```

## How It Works

### Frontend Logic

In [src/pages/PhotoView.jsx](src/pages/PhotoView.jsx):

1. **Admin Check**: On page load, checks if current user has `is_admin = true`
2. **Payment Mode**: `MOCK_PAYMENT` is automatically set based on admin status:
   - `isAdmin = true` → Test payment (no real charge)
   - `isAdmin = false` → Live Stripe payment

3. **UI Indicator**: Admin users see a purple badge:
   ```
   👑 Admin Mode Active
   Test payment enabled - no real charges
   ```

### Backend Behavior (Test Mode)

When admin makes a "purchase":
- Simulates 2-second payment delay
- Creates transaction record in database
- Marks code as purchased
- Unlocks all photos
- Downloads original photos
- Updates photographer earnings
- **NO Stripe charge is made**

### Backend Behavior (Live Mode)

Regular users:
- Real Stripe payment flow
- Stripe Payment Intent created
- Actual card charge
- Same database updates as test mode

## Testing the Admin Flow

1. **Create a test user**:
   - Sign up with a new account
   - Set it as admin using one of the methods above

2. **Generate a photo code**:
   - Use photographer dashboard to upload photos
   - Create a code

3. **Test purchase as admin**:
   - Navigate to `/photo/:code`
   - You should see the purple "Admin Mode Active" badge
   - Click "Unlock All Photos"
   - Payment should complete without Stripe (2-second delay)
   - Photos should unlock successfully

4. **Test purchase as regular user**:
   - Log out and sign in with a non-admin account
   - Navigate to the same code
   - You should NOT see the admin badge
   - Click "Unlock All Photos"
   - Real Stripe payment modal should appear

## Removing Admin Access

To revoke admin privileges:

```sql
UPDATE public.profiles
SET is_admin = FALSE
WHERE email = 'user-email@example.com';
```

## Security Notes

- Admin status is stored in the database (not client-side)
- Each page load verifies admin status from database
- Admin mode only affects payment processing
- All other business logic (purchases, downloads, etc.) remains the same
- Admin purchases still appear in photographer earnings dashboard

## Troubleshooting

### Admin badge not showing

1. Clear browser cache and reload
2. Check database: `SELECT is_admin FROM profiles WHERE email = 'your-email'`
3. Check browser console for `[Admin Check]` logs

### Still seeing Stripe modal as admin

1. Log out and log back in
2. Verify `is_admin = TRUE` in database
3. Check if there are any JavaScript errors in console

### Test payment not completing

1. Check browser console for errors
2. Verify database connection
3. Check if `MOCK_PAYMENT` variable is `true` in PhotoView component
