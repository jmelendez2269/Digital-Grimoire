# 📧 Complete Email Templates Guide - Convergence Library

**Last Updated:** November 10, 2025  
**Status:** Complete  
**Theme:** Dark Academia Aesthetic

---

## Overview

This document contains all email templates for Convergence Library (Digital Grimoire), styled with a dark academia aesthetic that matches the application's branding.

### Design System

**Colors:**
- Background: `#18181b` (dark slate)
- Container: `#27272a` (lighter slate with gradient)
- Text Primary: `#fef3c7` (cream/yellow)
- Text Secondary: `#a1a1aa` (muted gray)
- Accent: `#f59e0b` (amber)
- Border: `#3f3f46` (medium gray)
- Footer Text: `#71717a` (darker gray)

**Typography:**
- Font Family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Heading: 24px, centered
- Body: 16px, line-height 1.6

**Brand Voice:**
- Greeting: "Greetings, Scholar."
- Closing: "Digital Grimoire - Your Esoteric Knowledge Repository"
- Tone: Formal, scholarly, mystical

---

## Template 1: Confirm Signup (Email Verification)

**Location in Supabase:** Authentication → Email Templates → **Confirm signup**

### Subject Line
```
Welcome to Convergence Library - Verify Your Email
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .info {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>Welcome to Convergence Library</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>Thank you for joining our repository of esoteric knowledge. To complete your registration and begin your journey through the archives, please verify your email address by clicking the button below:</p>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Verify Email Address</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="info">
      <p style="margin: 0; color: #fef3c7;"><strong>What's Next?</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        Once verified, you'll have access to our complete library of sacred texts, 
        ancient wisdom, and scholarly resources. Begin your exploration of the mysteries.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This verification link will expire in 24 hours.</p>
      <p style="margin: 8px 0 0;">
        If you didn't create an account, you can safely ignore this email.
      </p>
      <p style="margin: 16px 0 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template 2: Reset Password

**Location in Supabase:** Authentication → Email Templates → **Reset password**

**Status:** ✅ Already configured

**Note:** This template is already set up. See `docs/Setup Docs/SUPABASE_PASSWORD_RESET_SETUP.md` for the complete template.

---

## Template 3: Magic Link

**Location in Supabase:** Authentication → Email Templates → **Magic link**

### Subject Line
```
Your Convergence Library Sign-In Link
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .warning {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>Sign In to Convergence Library</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>You've requested a magic link to sign in to your Convergence Library account. Click the button below to access your account:</p>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Sign In</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="warning">
      <p style="margin: 0; color: #fef3c7;"><strong>Security Notice:</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        This link will automatically sign you in without a password. 
        If you didn't request this link, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This link will expire in 1 hour.</p>
      <p style="margin: 8px 0 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template 4: Change Email Address

**Location in Supabase:** Authentication → Email Templates → **Change email address**

### Subject Line
```
Confirm Your New Email Address - Convergence Library
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .warning {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .email-display {
      background-color: rgba(63, 63, 70, 0.5);
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      margin: 16px 0;
      color: #fef3c7;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>Confirm Email Change</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>You've requested to change the email address associated with your Convergence Library account. To confirm this change, please click the button below:</p>
    
    <div class="email-display">
      New Email: {{ .Email }}
    </div>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Change</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="warning">
      <p style="margin: 0; color: #fef3c7;"><strong>Important:</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        If you didn't request this email change, please contact support immediately. 
        Your account security may be at risk.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This confirmation link will expire in 1 hour.</p>
      <p style="margin: 8px 0 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template 5: Invite User

**Location in Supabase:** Authentication → Email Templates → **Invite user**

### Subject Line
```
You've Been Invited to Convergence Library
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .info {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>You've Been Invited</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>You've been invited to join Convergence Library, a repository of esoteric knowledge, sacred texts, and scholarly resources. To accept this invitation and create your account, click the button below:</p>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Accept Invitation</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="info">
      <p style="margin: 0; color: #fef3c7;"><strong>What to Expect:</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        Upon accepting, you'll gain access to our complete library, 
        including ancient texts, philosophical works, and esoteric knowledge 
        spanning centuries of human wisdom.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This invitation will expire in 7 days.</p>
      <p style="margin: 8px 0 0;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
      <p style="margin: 16px 0 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template 6: Reauthentication

**Location in Supabase:** Authentication → Email Templates → **Reauthentication**

### Subject Line
```
Reauthentication Required - Convergence Library
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .warning {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>Reauthentication Required</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>For security purposes, you need to reauthenticate your account to complete a sensitive action. Use the verification code below or click the button to verify your identity:</p>
    
    <div class="warning" style="text-align: center; padding: 24px; margin: 24px 0;">
      <p style="margin: 0; color: #fef3c7; font-size: 18px; font-weight: 600; letter-spacing: 4px; font-family: monospace;">
        {{ .Token }}
      </p>
      <p style="margin: 12px 0 0; color: #a1a1aa; font-size: 14px;">
        Enter this code to complete reauthentication
      </p>
    </div>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Or Click Here to Reauthenticate</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="warning">
      <p style="margin: 0; color: #fef3c7;"><strong>Security Notice:</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        This code and link are required for sensitive account operations. 
        If you didn't initiate this request, please secure your account immediately.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This reauthentication link will expire in 1 hour.</p>
      <p style="margin: 8px 0 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template 7: Welcome Email (Custom)

**Note:** This is a custom welcome email that should be sent after email verification is complete. This requires custom implementation in your application code.

### Subject Line
```
Welcome to Convergence Library - Your Journey Begins
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #18181b;
      color: #fef3c7;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #27272a 0%, #18181b 100%);
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      position: relative;
    }
    h1 {
      color: #fef3c7;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #f59e0b;
      color: #18181b;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #3f3f46;
      color: #71717a;
      font-size: 14px;
      text-align: center;
    }
    .info {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .features {
      margin: 24px 0;
    }
    .feature-item {
      color: #a1a1aa;
      margin: 12px 0;
      padding-left: 24px;
      position: relative;
    }
    .feature-item::before {
      content: "✦";
      position: absolute;
      left: 0;
      color: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-circle"></div>
      <h1>Welcome, Scholar</h1>
    </div>
    
    <p>Greetings, and welcome to Convergence Library.</p>
    
    <p>Your account has been verified, and you now have full access to our repository of esoteric knowledge. The archives await your exploration.</p>
    
    <div class="info">
      <p style="margin: 0; color: #fef3c7;"><strong>Begin Your Journey:</strong></p>
      <div class="features">
        <div class="feature-item">Explore our library of sacred texts and ancient wisdom</div>
        <div class="feature-item">Create personal journals and annotations</div>
        <div class="feature-item">Build your collection of esoteric knowledge</div>
        <div class="feature-item">Connect ideas across texts with our convergence tools</div>
      </div>
    </div>
    
    <div class="button-container">
      <a href="https://convergencelibrary.com/library" class="button">Explore the Library</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px; margin-top: 24px;">
      Questions? Visit our help center or reach out to our support team.
    </p>
    
    <div class="footer">
      <p style="margin: 0;">
        Convergence Library - Your Esoteric Knowledge Repository
      </p>
      <p style="margin: 8px 0 0; font-size: 12px;">
        You're receiving this email because you just verified your account.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Implementation Instructions

### Step 1: Access Supabase Email Templates

1. Log in to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. You'll see a list of available templates

### Step 2: Configure Each Template

For each template above:

1. Click on the template name (e.g., "Confirm signup")
2. Copy the **Subject Line** from this document
3. Switch to **Source** view (not Preview)
4. Paste the **Email Body (HTML)** from this document
5. Click **Save**

### Step 3: Test Templates

After configuring each template:

1. Test the email flow (e.g., register a new account for verification email)
2. Check that emails render correctly in:
   - Gmail (web and mobile)
   - Outlook (web and desktop)
   - Apple Mail
   - Dark mode email clients
   - Light mode email clients

### Step 4: Verify Variables

Ensure these Supabase template variables are preserved:
- `{{ .ConfirmationURL }}` - The confirmation/action link (used in most templates)
- `{{ .Email }}` - User's email address (used in change email template)
- `{{ .Token }}` - Token code (used in reauthentication template - users enter this code manually)
- `{{ .TokenHash }}` - Token hash (if used)

---

## Testing Checklist

- [ ] Confirm signup template renders correctly
- [ ] Reset password template renders correctly (already done)
- [ ] Magic link template renders correctly
- [ ] Change email template renders correctly
- [ ] Invite user template renders correctly
- [ ] Reauthentication template renders correctly
- [ ] All templates work in dark mode email clients
- [ ] All templates work in light mode email clients
- [ ] All links are clickable and functional
- [ ] Mobile rendering is correct
- [ ] Desktop rendering is correct

---

## Custom Welcome Email Implementation

The welcome email (Template 7) is not a standard Supabase template. To implement it:

### Option 1: SendGrid API (Recommended)

Create an API route that sends the welcome email after verification:

```typescript
// app/api/send-welcome-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  
  const msg = {
    to: email,
    from: 'noreply@convergencelibrary.com',
    subject: 'Welcome to Convergence Library - Your Journey Begins',
    html: welcomeEmailTemplate, // Use Template 7 HTML
  };
  
  await sgMail.send(msg);
  return NextResponse.json({ success: true });
}
```

### Option 2: Supabase Database Function

Create a database function that triggers on email verification and sends via SendGrid.

---

## Maintenance Notes

- **Regular Review:** Check email templates quarterly for updates
- **A/B Testing:** Consider testing different subject lines for better open rates
- **Accessibility:** Ensure color contrast meets WCAG AA standards
- **Mobile First:** Test on mobile devices first, then desktop
- **Link Tracking:** Monitor click rates in SendGrid dashboard

---

## Reference

- **Supabase Email Templates Docs:** https://supabase.com/docs/guides/auth/auth-email-templates
- **SendGrid Setup:** `docs/Setup Docs/SENDGRID_SETUP.md`
- **Password Reset Setup:** `docs/Setup Docs/SUPABASE_PASSWORD_RESET_SETUP.md`

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete

