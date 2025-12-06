# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Database setup (one-time, in Supabase dashboard)
# 1. Run supabase/schema.sql in SQL Editor
# 2. Follow supabase/storage-setup.md for storage buckets
```

## Environment Variables (CRITICAL)

The app **requires** Supabase configuration to work. Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Deployment to Vercel**: Set these as environment variables in Vercel dashboard under Settings → Environment Variables.

**OAuth Setup**: For Google sign-in, configure redirect URLs in:
- **Supabase**: Authentication → URL Configuration → Add production URL
- **Google Cloud Console**: Add `https://your-project.supabase.co/auth/v1/callback`

## Architecture Overview

### Two-Context System

The app uses a dual-context architecture in [src/App.jsx](src/App.jsx):

1. **AuthContext** ([src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx))
   - Handles user authentication (email/password, Google OAuth)
   - Manages user sessions and profiles
   - Provides `useAuth()` hook

2. **PhotographerContext** ([src/contexts/PhotographerContext.jsx](src/contexts/PhotographerContext.jsx))
   - Manages photographer-specific state and operations
   - Handles photo uploads with EXIF extraction
   - Generates 6-digit codes for photos
   - Auto-verification after 3 photo uploads
   - Provides `usePhotographer()` hook

Both contexts wrap the entire app and work independently.

### Core Routes

- `/` - Landing page (Hero, HowItWorks, EmotionalStory, ForWho, CTA)
- `/dashboard` - Photographer dashboard (protected route)
- `/photo/:code` - Photo view page (6-digit code lookup)

### Database Architecture

**Key Tables** (see [supabase/schema.sql](supabase/schema.sql)):

1. **profiles** - User profiles (1:1 with auth.users)
2. **photographer_profiles** - Photographer data with verification status
   - `verified` - Auto-set to true after 3 photo uploads
   - `status` - 'pending' | 'active' | 'suspended'
3. **photos** - Photo metadata, EXIF data, storage paths
4. **photo_codes** - 6-digit codes linking to photos
   - `code` - Unique 6-char code (e.g., "ABC123")
   - `is_purchased` - Payment status
   - `purchased_by` - User who bought the photo
5. **transactions** - Payment records

**Storage Buckets** (see [supabase/storage-setup.md](supabase/storage-setup.md)):

- `photos` - **Public** bucket for watermarked images
- `photos-original` - **Private** bucket for full-quality originals (RLS-protected, only accessible after purchase)

### 6-Digit Code System

The core workflow revolves around unique 6-digit codes:

1. Photographer uploads photo → auto-generates code (e.g., "ABC123")
2. User receives code on paper/verbally
3. User enters code on homepage → redirects to `/photo/:code`
4. User sees watermarked preview (free) or purchases original ($3)

Code generation in [src/contexts/PhotographerContext.jsx](src/contexts/PhotographerContext.jsx):
- Uses charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars)
- Database constraint ensures uniqueness
- Codes are immutable and tied to photos permanently

### Mock Payment System

**Location**: [src/pages/PhotoView.jsx](src/pages/PhotoView.jsx)

Set `MOCK_PAYMENT = true` (default) for testing without real transactions:
- Simulates 2-second payment delay
- Creates transaction records in database
- Grants access to `photos-original` bucket
- No Stripe/real payment integration required

To enable real payments: Set `MOCK_PAYMENT = false` and integrate Stripe.

### Auto-Verification Logic

**Trigger**: Uploading 3rd photo automatically verifies photographer

**Implementation**: PostgreSQL trigger in [supabase/schema.sql](supabase/schema.sql)
- Function `check_and_verify_photographer()` runs after photo insert
- Sets `verified = true` and `auto_verified_at` timestamp
- Updates `verification_photos_count`

**Frontend**: [src/contexts/PhotographerContext.jsx](src/contexts/PhotographerContext.jsx) refreshes photographer profile after each upload.

## Key Components

### Photo Upload Flow

1. **PhotoUpload** component ([src/components/PhotoUpload.jsx](src/components/PhotoUpload.jsx))
   - Drag & drop interface
   - EXIF extraction using `exifr` library
   - Uploads to both `photos` (watermarked) and `photos-original` buckets
   - Creates photo record + generates unique code

2. **Code Display**
   - Shows 6-digit code with QR code
   - Photographer shares with subject

### Photo Lookup & Purchase Flow

1. User enters code in Hero or CTA components
2. Navigate to `/photo/:code`
3. **PhotoView** page ([src/pages/PhotoView.jsx](src/pages/PhotoView.jsx)):
   - Fetches photo by code
   - Shows watermarked preview (always accessible)
   - "Unlock Full Quality $3" button triggers mock/real payment
   - Downloads original after successful purchase

## Development Patterns

### Supabase Client

Singleton client in [src/lib/supabase.js](src/lib/supabase.js):
```javascript
import { supabase } from '../lib/supabase'
```

Always check `isSupabaseConfigured()` before critical operations.

### Row Level Security (RLS)

All tables use RLS policies:
- Users can only update their own profiles
- Photographers can only upload/delete their own photos
- Photo buyers can access purchased originals via storage policies

When debugging access issues, check RLS policies in Supabase dashboard.

### Protected Routes

Use `<ProtectedRoute>` wrapper ([src/components/ProtectedRoute.jsx](src/components/ProtectedRoute.jsx)):
```jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <PhotographerDashboard />
  </ProtectedRoute>
} />
```

Redirects to home if not authenticated.

## Common Issues

### "supabaseUrl is required" on Vercel

**Cause**: Environment variables not set in Vercel
**Fix**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel dashboard → Settings → Environment Variables → Redeploy

### Google OAuth redirects to localhost:3000

**Cause**: Missing production URL in Supabase redirect URLs
**Fix**:
1. Supabase → Authentication → URL Configuration
2. Add Vercel URL to "Redirect URLs"
3. Update "Site URL" to production domain

### Storage upload fails with "new row violates row-level security policy"

**Cause**: User not in `photographer_profiles` table or wrong bucket permissions
**Fix**: Check storage policies in [supabase/storage-setup.md](supabase/storage-setup.md)

### Photo code not found

**Cause**: Code hasn't been generated or database not configured
**Fix**: Ensure `photo_codes` table exists and `generate_photo_code()` trigger is active

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Styling**: Tailwind CSS v4 (configured via Vite plugin)
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Image Processing**: exifr (EXIF metadata extraction)
- **Deployment**: Vercel (frontend) + Supabase (backend)

## File Organization

```
src/
├── components/          # UI components
│   ├── photographer/    # Photographer-specific components
│   ├── AuthModal.jsx
│   ├── Navbar.jsx
│   └── PhotographerDashboard.jsx
├── contexts/            # React contexts (Auth + Photographer)
├── pages/               # Route pages
│   └── PhotoView.jsx    # /photo/:code route
├── lib/                 # Utilities
│   └── supabase.js      # Supabase client singleton
└── App.jsx              # Router + context providers

supabase/
├── schema.sql           # Database schema with triggers
└── storage-setup.md     # Storage bucket configuration
```
