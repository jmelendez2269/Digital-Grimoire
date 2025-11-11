# 📧 Welcome Email Implementation Guide

**Last Updated:** November 10, 2025  
**Status:** Implementation Guide  
**Type:** Custom Email (Not Supabase Template)

---

## Overview

The welcome email is a custom email sent after a user successfully verifies their email address. Unlike other Supabase email templates, this requires custom implementation using SendGrid's API.

---

## Implementation Options

### Option 1: SendGrid API (Recommended)

Send the welcome email directly via SendGrid API after email verification.

### Option 2: Supabase Database Function

Use a Supabase database function triggered on email verification.

---

## Option 1: SendGrid API Implementation

### Step 1: Install SendGrid SDK

```bash
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
pnpm add @sendgrid/mail
```

### Step 2: Create API Route

Create a new API route for sending welcome emails:

```typescript
// app/api/send-welcome-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Welcome email HTML template
const welcomeEmailTemplate = `<!DOCTYPE html>
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
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://convergencelibrary.com'}/library" class="button">Explore the Library</a>
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
</html>`;

export async function POST(request: NextRequest) {
  try {
    // Verify API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured' },
        { status: 500 }
      );
    }

    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const msg = {
      to: email,
      from: {
        email: 'noreply@convergencelibrary.com',
        name: 'Convergence Library',
      },
      subject: 'Welcome to Convergence Library - Your Journey Begins',
      html: welcomeEmailTemplate,
    };

    await sgMail.send(msg);

    return NextResponse.json({ 
      success: true,
      message: 'Welcome email sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send welcome email',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
```

### Step 3: Update Auth Callback to Send Welcome Email

Modify the auth callback route to send welcome email after verification:

```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type'); // 'signup' or 'recovery'

  if (code) {
    const supabase = createClient();
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=verification_failed`
      );
    }

    // If this is a signup verification, send welcome email
    if (type === 'signup' && data.user?.email) {
      try {
        // Send welcome email (fire and forget - don't block redirect)
        fetch(`${requestUrl.origin}/api/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email,
          }),
        }).catch((err) => {
          // Log error but don't block user flow
          console.error('Failed to send welcome email:', err);
        });
      } catch (err) {
        // Silently fail - welcome email is nice to have, not critical
        console.error('Error triggering welcome email:', err);
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
```

### Step 4: Add Environment Variable

Add SendGrid API key to your environment variables:

**Vercel:**
- Go to Project Settings → Environment Variables
- Add: `SENDGRID_API_KEY` = `[Your SendGrid API Key]`
- Apply to Production, Preview, and Development

**Local (.env.local):**
```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

### Step 5: Test Welcome Email

1. Register a new account
2. Verify email address
3. Check inbox for welcome email
4. Verify email renders correctly
5. Test link to library

---

## Option 2: Database Function (Alternative)

If you prefer to use a database function instead:

### Step 1: Create Database Function

```sql
-- migrations/XXX_send_welcome_email_function.sql
CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- This would require a Supabase Edge Function or external API call
  -- For now, use Option 1 (API route) instead
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on email verification
CREATE TRIGGER on_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION send_welcome_email();
```

**Note:** This approach requires additional setup with Supabase Edge Functions or external HTTP calls, which is more complex than Option 1.

---

## Testing

### Manual Testing

1. **Register New Account:**
   - Go to `/register`
   - Create account with real email
   - Verify email
   - Check inbox for welcome email

2. **Verify Email Content:**
   - Check subject line
   - Verify HTML renders correctly
   - Test "Explore the Library" button
   - Check mobile rendering
   - Check dark/light mode

3. **Check SendGrid Dashboard:**
   - Verify email was sent
   - Check delivery status
   - Verify no bounces

### Automated Testing (Optional)

```typescript
// __tests__/welcome-email.test.ts
import { POST } from '@/app/api/send-welcome-email/route';

describe('Welcome Email API', () => {
  it('should send welcome email successfully', async () => {
    const request = new Request('http://localhost/api/send-welcome-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return error if email is missing', async () => {
    const request = new Request('http://localhost/api/send-welcome-email', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

---

## Troubleshooting

### Welcome Email Not Sending

**Check:**
1. SendGrid API key is configured correctly
2. API route is accessible
3. Auth callback is calling the API route
4. Check application logs for errors
5. Verify SendGrid account has sending permissions

### Email Not Arriving

**Check:**
1. SendGrid dashboard for delivery status
2. Check spam folder
3. Verify sender email is authenticated
4. Check SendGrid account limits

### Errors in Logs

**Common Issues:**
- Missing SendGrid API key
- Invalid API key
- Rate limiting
- SendGrid account issues

---

## Best Practices

1. **Don't Block User Flow:** Send welcome email asynchronously
2. **Error Handling:** Log errors but don't prevent user from accessing app
3. **Rate Limiting:** Consider rate limiting the API route
4. **Personalization:** Use user's name if available
5. **Testing:** Always test with real email addresses

---

## Future Enhancements

- [ ] Add user's name to welcome email
- [ ] Personalize based on signup source
- [ ] A/B test different welcome email content
- [ ] Track welcome email open rates
- [ ] Add onboarding tips in welcome email

---

## Reference

- **Email Templates:** `docs/Setup Docs/EMAIL_TEMPLATES_COMPLETE.md`
- **SendGrid Setup:** `docs/Setup Docs/SENDGRID_SETUP.md`
- **SendGrid Node.js SDK:** https://github.com/sendgrid/sendgrid-nodejs

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implementation Guide Complete

