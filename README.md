# 📸 Snappo

**Captured by chance. Owned by choice.**

A playful, emotional landing page for a photo-based memory platform that connects photographers and people through spontaneous photo moments.

## ✨ Features

- 🎨 **Duolingo + Brilliant inspired design** - Colorful, friendly, gamified tone
- 🎬 **Smooth animations** - Powered by Framer Motion
- 🌈 **Beautiful gradients** - Warm, inviting color palette
- 📱 **Fully responsive** - Works perfectly on all devices
- ⚡ **Fast & Modern** - Built with React + Vite + Tailwind CSS
- 🔐 **Authentication** - Supabase Auth with email/password and Google OAuth
- 👤 **User Management** - Sign up, sign in, and profile management
- 📸 **Photographer System** - Role-based photographer profiles with verification
- 🖼️ **Photo Upload** - Drag & drop photo upload with automatic code generation
- 💰 **Auto-verification** - First 3 photos auto-approved for photographer verification
- 🎫 **6-Digit Codes** - Unique codes for each photo

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables (see Supabase Setup below)
cp .env .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 🔐 Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a free account
   - Create a new project

2. **Get Your Credentials**
   - Go to Project Settings > API
   - Copy your `Project URL` and `anon public` API key

3. **Configure Environment Variables**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Enable Google OAuth (Optional)**
   - Go to Authentication > Providers in your Supabase dashboard
   - Enable Google provider
   - Add your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:5173` (for local development)

5. **Set up Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/schema.sql`
   - Run the SQL script to create all tables, functions, and triggers

6. **Set up Storage Buckets**
   - Follow the instructions in `supabase/storage-setup.md`
   - Create `photos` and `photos-original` buckets
   - Configure storage policies

7. **Email Configuration (Optional)**
   - Go to Authentication > Email Templates
   - Customize your confirmation and reset password emails
   - Configure SMTP settings (optional for production)

## 🎯 How It Works

### For Users:
1. **📸 Camera Flash** - A photographer captures your perfect moment
2. **🎟️ Get Your Code** - Receive a unique 6-digit code on the spot
3. **⌨️ Enter & Unlock** - Type your code on our website anytime
4. **💾 Download** - Get your photo - watermarked free or $3 for full quality

### For Photographers:
1. **✨ Sign Up** - Create an account and apply to become a photographer
2. **📤 Upload Photos** - Upload photos with drag & drop interface
3. **🔑 Get Codes** - Automatic 6-digit code generation for each photo
4. **✅ Auto-Verification** - Upload 3 photos to get verified
5. **💰 Earn** - Earn $2 per photo sold

## 🏗️ Project Structure

```
src/
├── components/
│   ├── Navbar.jsx                  # Navigation with auth and photographer features
│   ├── AuthModal.jsx               # Login/Signup modal
│   ├── BecomePhotographerModal.jsx # Photographer application modal
│   ├── PhotographerDashboard.jsx   # Photographer dashboard with stats
│   ├── PhotoUpload.jsx             # Photo upload component with drag & drop
│   ├── Hero.jsx                    # Hero section with code input
│   ├── HowItWorks.jsx              # Animated timeline of the process
│   ├── EmotionalStory.jsx          # Parallax scrolling story section
│   ├── ForWho.jsx                  # Flip cards for photographers/users
│   ├── CTA.jsx                     # Call-to-action with code input
│   └── Footer.jsx                  # Footer with social links
├── contexts/
│   └── AuthContext.jsx             # Authentication context and hooks
├── lib/
│   └── supabase.js                 # Supabase client configuration
├── App.jsx                         # Main app with routing
├── index.css                       # Global styles with Tailwind
└── main.jsx                        # React entry point

supabase/
├── schema.sql                      # Database schema (tables, functions, triggers)
└── storage-setup.md                # Storage buckets setup guide
```

## 🎨 Design Philosophy

- **Colorful & Friendly** - Inspired by Duolingo's approachable design
- **Vibrant Gradients** - Following Brilliant's bold color blocks
- **Emotional Imagery** - VSCO-inspired minimal, emotional aesthetic
- **Playful Animations** - Micro-interactions that delight users
- **Soft Shapes** - Rounded corners, smooth shadows, organic forms

## 🛠️ Technologies

- **React 18** - UI library
- **React Router** - Client-side routing
- **Vite** - Fast build tool
- **Tailwind CSS v4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Supabase** - Backend as a Service (Auth, Database, Storage)
  - Authentication with email/password and OAuth
  - PostgreSQL database with RLS
  - Storage for photo uploads
- **Poppins Font** - Friendly typography

## 🎭 Sections

1. **Hero** - Main headline with animated background and code input
2. **How It Works** - 4-step animated timeline
3. **Emotional Story** - Parallax scrolling with inspirational message
4. **For Who** - Interactive flip cards for photographers and users
5. **CTA** - Final call-to-action with code input
6. **Footer** - Social links and newsletter signup

## 🌟 Key Features

- ✨ Floating photo card animations
- 🎯 Interactive code input with validation
- 🔄 3D flip card effects
- 📜 Smooth parallax scrolling
- 💫 Hover micro-interactions
- 🎨 Custom gradient utilities
- 📱 Mobile-first responsive design
- 🔐 Email/Password authentication
- 🌐 Google OAuth integration
- 👤 User profile management
- 🎨 Beautiful auth modal with animations

## 📝 License

Built with ❤️ for Snappo

---

**Made for the spontaneous, by creators who love moments.**
