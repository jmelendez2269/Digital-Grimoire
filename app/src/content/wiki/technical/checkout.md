---
title: Checkout Security
type: security-spec
status: stable
audience: developer
description: Security measures for Stripe checkout including rate limiting and fraud detection.
---

# Checkout Security Implementation

## Overview

Security protocols implemented to protect the checkout flow from abuse and fraud.

---

## 1. Implemented Measures

### Rate Limiting

Prevents abuse of the checkout session creation endpoint.

| Type | Limit | Scope | Implementation |
| :--- | :--- | :--- | :--- |
| **IP-based** | 3 / hour | Unauthenticated | Middleware / API Route |
| **User-based** | 2 / hour | Authenticated User | API Route Logic |

**Location:** `app/src/app/api/stripe/create-checkout-session/route.ts`

### Stripe Radar

Metadata is sent to Stripe to enable AI-based fraud detection.

**Metadata Fields:**

- `user_id`
- `user_email`
- `checkout_source` ('web')
- `ip_address`

### reCAPTCHA (Optional)

Supported but currently **optional**.

- **Server:** Logic exists to verify tokens if provided.
- **Client:** Hook is in place but disabled by default to reduce friction.
- **Fallback:** Fails gracefully if keys are missing.

---

## 2. Configuration

### Environment Variables

Required for full security suite:

```env
# Optional reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

### Stripe Radar Rules

Configure in [Stripe Dashboard](https://dashboard.stripe.com/radar/rules):

1. **Block** high-risk payments.
2. **Review** elevated-risk payments.
3. **3D Secure** enabled for high-risk.

---

## 3. Verification

### Testing Rate Limits

1. Attempt to create 4 checkout sessions rapidly from the same IP.
2. Expect `429 Too Many Requests` on the 4th attempt.
3. Check headers: `X-RateLimit-Remaining`, `Retry-After`.

### Testing Fraud Logic

- Use Stripe test cards for specific decline codes (e.g., `4000 0000 0000 0002` typically triggers Radar).
