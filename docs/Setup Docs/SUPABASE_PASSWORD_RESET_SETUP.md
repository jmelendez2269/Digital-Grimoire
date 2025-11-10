# Supabase Password Reset Setup Guide

## Quick Setup Checklist

Follow these steps to configure password reset functionality in Supabase:

---

## Step 1: Configure Email Templates

### Navigate to Email Templates
1. Open your Supabase Dashboard
2. Go to **Authentication** → **Email Templates**
3. Select **Reset Password** template

### Update Template Content

**Subject:**
```
Reset your Digital Grimoire password
```

**Email Body (HTML):**
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
      <h1>Reset Your Password</h1>
    </div>
    
    <p>Greetings, Scholar.</p>
    
    <p>A password reset has been requested for your Digital Grimoire account. To create a new password, click the button below:</p>
    
    <div class="button-container">
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    </div>
    
    <p style="text-align: center; color: #71717a; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div class="warning">
      <p style="margin: 0; color: #fef3c7;"><strong>Security Notice:</strong></p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">
        If you didn't request this password reset, you can safely ignore this email. 
        Your password will not be changed.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This link will expire in 1 hour.</p>
      <p style="margin: 8px 0 0;">
        Digital Grimoire - Your Esoteric Knowledge Repository
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Step 2: Configure Redirect URLs

### Add Allowed Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. In the **Redirect URLs** section, add:

**Development:**
```
http://localhost:3000/reset-password
http://localhost:3000/*
```

**Production:**
```
https://convergencelibrary.com/reset-password
https://convergencelibrary.com/*
```

### Configure Site URL

Set your site URL in the same section:

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://convergencelibrary.com
```

---

## Step 3: Configure Email Settings

### Default Email Service (Development)

Supabase provides a default email service for development:
- **Rate Limited:** 3 emails per hour
- **For Testing Only**
- No configuration needed

### Custom SMTP (Production Recommended)

For production, configure a custom SMTP provider:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure your SMTP provider:

**Example with SendGrid:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@convergencelibrary.com
Sender Name: Convergence
```

**Note:** See `docs/Setup Docs/SENDGRID_SETUP.md` for complete SendGrid configuration including DNS records for domain authentication and link branding.

**Example with AWS SES:**
```
SMTP Host: email-smtp.us-east-1.amazonaws.com
SMTP Port: 587
SMTP Username: [Your SES SMTP Username]
SMTP Password: [Your SES SMTP Password]
Sender Email: noreply@convergencelibrary.com
Sender Name: Convergence
```

---

## Step 4: Configure Security Settings

### Rate Limiting

1. Go to **Authentication** → **Rate Limits**
2. Configure these limits:

```
Password Reset Requests: 3 per hour per email
Email Sign-up: 3 per hour per IP
Failed Login Attempts: 5 per hour per IP
```

### Token Expiration

1. Go to **Authentication** → **Settings**
2. Configure:

```
Magic Link Expiry: 3600 seconds (1 hour)
Refresh Token Expiry: 604800 seconds (7 days)
```

### Email Confirmation

Configure if email confirmation is required:

```
✓ Enable email confirmations
✓ Require email verification
□ Enable email change confirmations (optional)
```

---

## Step 5: Test the Setup

### Testing Checklist

1. **Request Password Reset**
   - Go to `/forgot-password`
   - Enter a valid email address
   - Verify success message appears

2. **Check Email Delivery**
   - Check inbox for reset email
   - Verify email formatting is correct
   - Check spam folder if not received

3. **Click Reset Link**
   - Click the reset link in email
   - Verify redirect to `/reset-password`
   - Check that token is validated

4. **Reset Password**
   - Enter new password
   - Confirm password
   - Verify success message
   - Verify redirect to login

5. **Login with New Password**
   - Try logging in with new password
   - Verify old password no longer works

---

## Step 6: Monitor and Maintain

### View Logs

Monitor authentication events:
1. Go to **Authentication** → **Logs**
2. Filter by `password_recovery` events
3. Check for errors or suspicious activity

### Common Issues to Monitor

- High rate of failed reset attempts
- Unusual patterns of reset requests
- Token expiration errors
- Email delivery failures

---

## Environment Variables

Ensure these are set in your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Custom SMTP (if not using Supabase default)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

---

## Troubleshooting

### Email Not Sending

**Symptoms:**
- Users don't receive reset emails
- Error in Supabase logs

**Solutions:**
1. Check SMTP configuration
2. Verify sender email is verified
3. Check rate limits aren't exceeded
4. Review Supabase logs for specific errors
5. Test with a different email provider

### Invalid Redirect URL Error

**Symptoms:**
- Error: "Invalid redirect URL"
- Reset link doesn't work

**Solutions:**
1. Add redirect URL to allowed list
2. Ensure URL format matches exactly
3. Include protocol (http:// or https://)
4. Clear browser cache and retry

### Token Expired Error

**Symptoms:**
- "Invalid or expired reset link" message
- Link worked previously but doesn't now

**Solutions:**
1. Request a new reset link
2. Increase token expiration time if needed
3. Ensure user clicks link quickly
4. Check system time is correct

### Rate Limit Exceeded

**Symptoms:**
- "Too many requests" error
- Can't request reset email

**Solutions:**
1. Wait for rate limit to reset
2. Adjust rate limits if too restrictive
3. Check for potential abuse
4. Consider implementing CAPTCHA

---

## Security Best Practices

### Email Security
- Use SPF/DKIM/DMARC records (see `docs/Setup Docs/SENDGRID_SETUP.md` for DNS configuration)
- Verified sender domain (convergencelibrary.com)
- Secure SMTP connection (TLS)
- Monitor bounce rates
- Link branding configured for better deliverability

### Token Security
- Short expiration times (1 hour recommended)
- One-time use tokens
- Secure token generation
- Rate limiting

### Application Security
- HTTPS in production
- Secure headers
- Content Security Policy
- Regular security audits

---

## Production Checklist

Before going live, ensure:

- [ ] Custom SMTP configured
- [ ] Sender email verified
- [ ] Redirect URLs updated for production domain
- [ ] Rate limits configured appropriately
- [ ] Email template tested and looks good
- [ ] Token expiration set correctly
- [ ] Monitoring/logging enabled
- [ ] Error handling tested
- [ ] Security headers configured
- [ ] SSL certificate valid
- [ ] Email deliverability tested
- [ ] Backup email provider configured (optional)

---

## Support Resources

### Supabase Documentation
- [Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Setup](https://supabase.com/docs/guides/auth/auth-smtp)

### Email Provider Guides
- [SendGrid Setup Guide](../Setup Docs/SENDGRID_SETUP.md) - Complete setup for convergencelibrary.com
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [AWS SES Setup](https://docs.aws.amazon.com/ses/)
- [Mailgun Setup](https://documentation.mailgun.com/)

### Testing Tools
- [Mail-Tester](https://www.mail-tester.com/) - Email deliverability
- [MXToolbox](https://mxtoolbox.com/) - DNS/email diagnostics

---

## Quick Commands

### Test Email Configuration (via Supabase CLI)
```bash
supabase functions deploy --project-ref your-project-ref
```

### Check Logs
```bash
supabase logs --project-ref your-project-ref --type auth
```

### Verify Environment Variables
```bash
cat .env.local | grep SUPABASE
```

---

## Next Steps

After completing this setup:
1. ✅ Test the complete password reset flow
2. ✅ Document any custom configurations
3. ✅ Train support team on common issues
4. ✅ Set up monitoring and alerts
5. ✅ Review and update periodically

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Tested With:** Supabase v2.x, Next.js 14+

