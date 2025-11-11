# 🔐 Google OAuth Setup Guide

This guide will help you configure Google OAuth authentication for the Digital Grimoire app using Supabase.

## ✅ What's Implemented

### 1. Google Sign-In Button
- **Location:** `/app/src/components/LoginForm.tsx` and `/app/src/app/register/page.tsx`
- **Features:**
  - Google sign-in button with official Google logo
  - Integrated with existing authentication flow
  - Proper error handling and loading states
  - Redirects to callback route after authentication

### 2. OAuth Callback Handler
- **Location:** `/app/src/app/auth/callback/route.ts`
- **Features:**
  - Handles OAuth code exchange
  - Proper error handling for OAuth failures
  - Redirects to dashboard on success
  - Handles user cancellation gracefully

### 3. User Experience
- Users can sign in with Google from both login and register pages
- Seamless integration with existing email/password authentication
- Automatic profile creation on first Google sign-in
- No email verification required for OAuth users (handled by Google)

---

## 🔧 Supabase Configuration

### Step 1: Enable Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list of providers
4. Toggle it **ON**
5. Click **Configure** or the settings icon

### Step 2: Create Google OAuth Credentials

You need to create OAuth 2.0 credentials in the Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields:
     - App name: "Digital Grimoire" (or your app name)
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes (if needed):
     - `email`
     - `profile`
     - `openid`
   - Add test users (for development)
   - Save and continue

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Digital Grimoire Web Client"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://yourdomain.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
     > **Note:** Replace `<your-supabase-project-ref>` with your actual Supabase project reference (found in your Supabase dashboard URL)

7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### Step 3: Configure Google in Supabase

1. Back in Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enter the credentials:
   - **Client ID (for OAuth):** Paste your Google Client ID
   - **Client Secret (for OAuth):** Paste your Google Client Secret
3. Click **Save**

### Step 4: Configure Redirect URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, ensure these URLs are added:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```
3. Click **Save**

---

## 🧪 Testing

### Local Development

1. Make sure your Supabase project has Google OAuth enabled
2. Start your development server:
   ```bash
   cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
   pnpm dev
   ```
3. Navigate to `http://localhost:3000/login`
4. Click **Continue with Google**
5. You should be redirected to Google's sign-in page
6. After signing in, you should be redirected back to your app's dashboard

### Common Issues

#### Issue: "redirect_uri_mismatch" Error

**Solution:**
- Ensure the redirect URI in Google Cloud Console matches exactly:
  ```
  https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
  ```
- Check for trailing slashes or typos
- Make sure you're using the correct Supabase project reference

#### Issue: "OAuth client not found"

**Solution:**
- Verify the Client ID and Client Secret are correctly entered in Supabase
- Make sure you copied the credentials from the correct Google Cloud project

#### Issue: "Access blocked: This app's request is invalid"

**Solution:**
- If in development, add your email as a test user in Google OAuth consent screen
- Make sure the OAuth consent screen is properly configured
- For production, you'll need to verify your app with Google

#### Issue: User not redirected after Google sign-in

**Solution:**
- Check browser console for errors
- Verify the callback route is accessible: `http://localhost:3000/auth/callback`
- Check Supabase logs in the dashboard for authentication errors

---

## 🔒 Security Considerations

### Production Checklist

- [ ] OAuth consent screen is published (not in testing mode)
- [ ] App is verified with Google (if required)
- [ ] Production domain is added to authorized origins
- [ ] HTTPS is enabled for production
- [ ] Client Secret is stored securely in Supabase (never commit to git)
- [ ] Redirect URLs are restricted to your domains only

### Environment Variables

No additional environment variables are needed for Google OAuth. Supabase handles the OAuth flow server-side, and the credentials are stored securely in Supabase's dashboard.

---

## 📝 How It Works

### Authentication Flow

1. **User clicks "Continue with Google"**
   - Client calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
   - Supabase generates an OAuth URL and redirects the user to Google

2. **User authenticates with Google**
   - Google validates the user's credentials
   - Google redirects back to Supabase with an authorization code

3. **Supabase exchanges code for session**
   - Supabase receives the code at `/auth/v1/callback`
   - Supabase exchanges the code for user information and creates/updates the user

4. **Supabase redirects to your app**
   - Supabase redirects to your callback route: `/auth/callback?code=...`
   - Your callback route exchanges the code for a session
   - User is redirected to the dashboard

### User Profile Creation

When a user signs in with Google for the first time:
- Supabase automatically creates a user account
- User's email and name are populated from Google profile
- Email is automatically verified (no email verification needed)
- A user profile may need to be created in your database (check your database triggers)

---

## 🎨 Customization

### Styling the Google Button

The Google sign-in button uses the app's existing design system. To customize:

1. Edit the button in `LoginForm.tsx` or `register/page.tsx`
2. The button uses Tailwind classes matching your app's theme
3. The Google logo SVG can be replaced with an image if preferred

### Additional OAuth Providers

To add more providers (GitHub, Discord, etc.):

1. Enable the provider in Supabase Dashboard
2. Add a similar button handler:
   ```typescript
   const handleProviderSignIn = async (provider: string) => {
     const { error } = await supabase.auth.signInWithOAuth({
       provider,
       options: {
         redirectTo: `${window.location.origin}/auth/callback`,
       },
     });
   };
   ```
3. Add buttons to your login/register forms

---

## 📚 Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## ✅ Verification

After setup, verify everything works:

1. ✅ Google provider is enabled in Supabase
2. ✅ OAuth credentials are configured correctly
3. ✅ Redirect URLs are set in both Google Cloud Console and Supabase
4. ✅ Users can sign in with Google from login page
5. ✅ Users can sign in with Google from register page
6. ✅ Users are redirected to dashboard after successful authentication
7. ✅ User profiles are created automatically
8. ✅ Existing email/password authentication still works

---

**Last Updated:** 2025-01-10  
**Status:** ✅ Implemented and Ready for Configuration

