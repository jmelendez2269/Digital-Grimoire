# 🔐 Google OAuth Setup Guide - Step-by-Step

**Last Updated:** November 10, 2025  
**Status:** ✅ Code Implemented - Configuration Required  
**Estimated Time:** 30-45 minutes

This guide provides step-by-step instructions to configure Google OAuth authentication for the Digital Grimoire app using Supabase.

---

## 📋 Quick Checklist

Before starting, ensure you have:
- ✅ Supabase account and project created
- ✅ Google account (Gmail account works)
- ✅ Access to Google Cloud Console
- ✅ Your Supabase project reference ID
- ✅ Production domain (convergencelibrary.com) - for production setup

**Setup Status:**
- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] OAuth credentials configured in Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Tested locally (localhost)
- [ ] Production domain added to Google OAuth
- [ ] Production redirect URLs configured
- [ ] OAuth consent screen published (for production)

---

## ✅ What's Already Implemented (Code Complete)

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

## 🔧 Step-by-Step Configuration

### Step 1: Get Your Supabase Project Reference

**You'll need this for the redirect URI:**

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Look at the URL in your browser - it will look like:
   ```
   https://app.supabase.com/project/abcdefghijklmnop
   ```
   OR look in **Settings** → **API** → **Project URL**
4. Your project reference is the part after `/project/` (e.g., `abcdefghijklmnop`)
5. **Write this down** - you'll need it for: `https://abcdefghijklmnop.supabase.co`

---

### Step 2: Create Google OAuth Credentials

#### 2.1 Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. If you don't have a project:
   - Click **"Select a project"** → **"New Project"**
   - Project name: `Digital Grimoire` (or your choice)
   - Click **"Create"**
4. If you have a project, select it from the dropdown

#### 2.2 Configure OAuth Consent Screen

1. In Google Cloud Console, navigate to **APIs & Services** → **OAuth consent screen**
2. If this is your first time, you'll be prompted to configure it:
   - **User Type:** Choose **External** (unless you have Google Workspace)
   - Click **"Create"**
3. Fill in the **App information:**
   - **App name:** `Digital Grimoire` (or your app name)
   - **User support email:** Select your email from dropdown
   - **App logo:** (Optional) Upload a logo if you have one
   - **App domain:** (Optional) `convergencelibrary.com`
   - **Application home page:** `https://convergencelibrary.com`
   - **Application privacy policy link:** `https://convergencelibrary.com/privacy`
   - **Application terms of service link:** `https://convergencelibrary.com/terms`
   - **Authorized domains:** Add `convergencelibrary.com`
4. Click **"Save and Continue"**
5. **Scopes** (Step 2):
   - Click **"Add or Remove Scopes"**
   - Select these scopes:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Click **"Update"** → **"Save and Continue"**
6. **Test users** (Step 3 - for development):
   - Click **"Add Users"**
   - Add your email address (and any test users)
   - Click **"Add"** → **"Save and Continue"**
7. **Summary** (Step 4):
   - Review your settings
   - Click **"Back to Dashboard"**

**Note:** For production, you'll need to publish the app (see Production Checklist section)

#### 2.3 Create OAuth Client ID

1. In Google Cloud Console, navigate to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If prompted about consent screen, click **"Configure Consent Screen"** (follow Step 2.2 above)
4. In the **Create OAuth client ID** form:
   - **Application type:** Select **"Web application"**
   - **Name:** `Digital Grimoire Web Client`
   - **Authorized JavaScript origins:** Click **"+ Add URI"** and add:
     ```
     http://localhost:3000
     https://convergencelibrary.com
     ```
     (Add one at a time, click **"+ Add URI"** for each)
   - **Authorized redirect URIs:** Click **"+ Add URI"** and add:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
     > **Replace `<your-supabase-project-ref>`** with your actual Supabase project reference from Step 1
     > 
     > Example: If your project ref is `abcdefghijklmnop`, use:
     > ```
     > https://abcdefghijklmnop.supabase.co/auth/v1/callback
     > ```
5. Click **"Create"**
6. **IMPORTANT:** A popup will show your credentials:
   - **Client ID:** Copy this (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Client Secret:** Copy this (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
   - **⚠️ Save these securely** - you won't be able to see the secret again!
   - Click **"OK"**

---

### Step 3: Enable Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers** (left sidebar)
4. Find **Google** in the list of providers
5. Toggle the switch to **ON** (it will turn blue/green)
6. The configuration form will appear below

---

### Step 4: Configure Google Credentials in Supabase

1. In the Google provider configuration form:
   - **Client ID (for OAuth):** Paste your Google Client ID from Step 2.3
   - **Client Secret (for OAuth):** Paste your Google Client Secret from Step 2.3
2. **DO NOT** change any other settings unless you know what you're doing
3. Click **"Save"** (button at the bottom)
4. You should see a success message: **"Provider settings updated"**

---

### Step 5: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, navigate to **Authentication** → **URL Configuration**
2. Scroll down to **Redirect URLs** section
3. Click **"+ Add URL"** and add these URLs (one at a time):
   ```
   http://localhost:3000/auth/callback
   https://convergencelibrary.com/auth/callback
   ```
4. Click **"Save"** after adding each URL
5. Verify both URLs appear in the list


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

**Before going live, complete these steps:**

1. **Publish OAuth Consent Screen:**
   - Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
   - Review all settings
   - Click **"PUBLISH APP"** button
   - Confirm publishing (this makes it available to all users, not just test users)

2. **Add Production Domain to Google OAuth:**
   - Go to Google Cloud Console → **APIs & Services** → **Credentials**
   - Click on your OAuth client ID to edit
   - Under **Authorized JavaScript origins**, add:
     ```
     https://convergencelibrary.com
     ```
   - Under **Authorized redirect URIs**, verify:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
   - Click **"Save"**

3. **Verify Production Redirect URL in Supabase:**
   - Supabase Dashboard → **Authentication** → **URL Configuration**
   - Ensure `https://convergencelibrary.com/auth/callback` is in the list

4. **Security Verification:**
   - ✅ HTTPS is enabled for production domain
   - ✅ Client Secret is stored securely in Supabase (never commit to git)
   - ✅ Redirect URLs are restricted to your domains only
   - ✅ OAuth consent screen is published (not in testing mode)

5. **Google Verification (if required):**
   - If your app requires sensitive scopes or has high user volume, Google may require app verification
   - This is usually not needed for basic email/profile scopes
   - See [Google OAuth Verification](https://support.google.com/cloud/answer/9110914) if prompted

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

