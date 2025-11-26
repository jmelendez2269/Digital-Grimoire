# Sentry Discord Notifications Setup Guide

**Last Updated:** November 25, 2025  
**Status:** Setup Guide  
**Priority:** Optional but Recommended

---

## 🎯 Overview

This guide shows you how to set up Discord notifications for Sentry alerts, so you get real-time notifications in your Discord server when errors occur in your application.

---

## 📋 Prerequisites

- ✅ Sentry project created and configured
- ✅ Discord server with admin permissions
- ✅ Discord webhook URL (we'll create this)

---

## 🔧 Step 1: Create a Discord Webhook

### Option A: Create Webhook in Discord Server

1. **Open Discord** and go to your server
2. **Go to Server Settings:**
   - Right-click your server name
   - Click **"Server Settings"**
3. **Navigate to Integrations:**
   - Click **"Integrations"** in the left sidebar
   - Click **"Webhooks"** tab
4. **Create New Webhook:**
   - Click **"New Webhook"**
   - **Name:** `Sentry Alerts` (or any name you prefer)
   - **Channel:** Select the channel where you want notifications (e.g., `#alerts`, `#errors`, `#monitoring`)
   - Click **"Copy Webhook URL"** - **SAVE THIS URL!** You'll need it in the next step
   - Click **"Save Changes"**

### Option B: Create Webhook via Channel Settings

1. **Right-click the channel** where you want notifications
2. Click **"Edit Channel"**
3. Go to **"Integrations"** → **"Webhooks"**
4. Click **"Create Webhook"**
5. Configure and copy the webhook URL

**⚠️ Important:** Keep your webhook URL secret! Anyone with this URL can send messages to your Discord channel.

---

## 🔗 Step 2: Add Discord Integration to Sentry

### Method 1: Via Sentry Dashboard (Recommended)

1. **Go to Sentry Dashboard:**
   - Navigate to [https://convergence-qa.sentry.io](https://convergence-qa.sentry.io)
   - Select your project: **javascript-nextjs**

2. **Navigate to Integrations:**
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"Integrations"** in the settings menu
   - Or go directly to: `Settings → Integrations`

3. **Find Discord Integration:**
   - Search for **"Discord"** in the integrations list
   - Click on **"Discord"** integration

4. **Install Discord Integration:**
   - Click **"Install"** or **"Add Integration"**
   - You may need to authorize Sentry to access Discord

5. **Configure Webhook:**
   - **Webhook URL:** Paste your Discord webhook URL from Step 1
   - **Channel Name:** (Optional) Name of the channel (for display purposes)
   - **Username:** (Optional) Custom username for Sentry bot (default: "Sentry")

6. **Configure Notification Settings:**
   - **Alert on:** Select which events trigger notifications:
     - ✅ **New Issues** - Get notified when a new error occurs
     - ✅ **Issue Resolved** - Get notified when an issue is marked as resolved
     - ✅ **Issue Assigned** - Get notified when an issue is assigned
     - ✅ **Issue Escalating** - Get notified when an issue escalates in severity
   - **Alert Rules:** Choose which alert rules should send to Discord
     - You can select specific alert rules or "All alert rules"

7. **Test the Integration:**
   - Click **"Send Test Notification"** (if available)
   - Check your Discord channel for the test message

8. **Save Configuration:**
   - Click **"Save Changes"** or **"Enable Integration"**

### Method 2: Via Alert Rules (Alternative)

If Discord integration isn't available as a direct integration, you can use webhooks:

1. **Go to Alert Rules:**
   - Navigate to **"Alerts"** → **"Alert Rules"** in Sentry
   - Click **"Create Alert Rule"** or edit an existing rule

2. **Configure Alert Rule:**
   - Set your conditions (e.g., "When an issue is created")
   - In **"Actions"** section, look for **"Send a notification via webhook"**

3. **Add Discord Webhook:**
   - **Webhook URL:** Paste your Discord webhook URL
   - **HTTP Method:** POST
   - **Content Type:** application/json

4. **Configure Payload (if needed):**
   - Sentry may have a Discord template, or you may need to format the payload
   - Discord webhooks expect JSON in this format:
   ```json
   {
     "content": "New error in Sentry!",
     "embeds": [{
       "title": "Error Title",
       "description": "Error description",
       "color": 15158332,
       "fields": [
         {
           "name": "Environment",
           "value": "production",
           "inline": true
         }
       ]
     }]
   }
   ```

---

## 🎨 Step 3: Customize Discord Notifications (Optional)

### Custom Webhook Payload

If you want more control over the Discord message format, you can create a custom webhook handler:

1. **Create API Route** (Optional - for advanced customization):
   - Create: `app/src/app/api/sentry-webhook/route.ts`
   - This route receives Sentry webhooks and formats them for Discord

2. **Use Sentry's Built-in Discord Integration:**
   - The built-in integration handles formatting automatically
   - You can customize via Sentry's notification settings

### Discord Message Format

Sentry's Discord integration typically sends messages like:

```
🔴 **New Issue: [Error Title]**

**Environment:** production
**Level:** error
**First Seen:** 2 minutes ago
**URL:** [Link to issue in Sentry]

[Error details and stack trace]
```

---

## ✅ Step 4: Test Your Setup

### Test Method 1: Trigger Test Error

1. **Visit your test page:**
   - Go to: `https://your-domain.com/sentry-example-page`
   - Click the button to trigger a test error

2. **Check Discord:**
   - Within seconds, you should see a notification in your Discord channel
   - The notification should include error details and a link to Sentry

### Test Method 2: Use Sentry Test Button

1. **In Sentry Dashboard:**
   - Go to **Settings** → **Integrations** → **Discord**
   - Click **"Send Test Notification"** (if available)

2. **Check Discord:**
   - You should receive a test message

### Test Method 3: Create Test Alert Rule

1. **Create a test alert rule:**
   - Go to **Alerts** → **Alert Rules** → **Create Alert Rule**
   - Condition: "When an issue is created"
   - Action: Send to Discord
   - Save the rule

2. **Trigger a test error** and verify Discord notification

---

## 🔔 Step 5: Configure Alert Rules

Now that Discord is connected, set up alert rules to control when you get notified:

### Recommended Alert Rules

1. **Critical Errors (High Priority):**
   - **Condition:** Issue level = "fatal" or "error"
   - **Action:** Send to Discord immediately
   - **Frequency:** Every time

2. **New Issues:**
   - **Condition:** When a new issue is created
   - **Action:** Send to Discord
   - **Frequency:** Every time

3. **Error Rate Spike:**
   - **Condition:** Error rate increases by 50% in 5 minutes
   - **Action:** Send to Discord
   - **Frequency:** Once per hour (to avoid spam)

4. **Issue Escalation:**
   - **Condition:** Issue severity increases
   - **Action:** Send to Discord
   - **Frequency:** Every time

### Create Alert Rule Steps

1. **Go to Alerts:**
   - Navigate to **"Alerts"** → **"Alert Rules"** in Sentry
   - Click **"Create Alert Rule"**

2. **Set Conditions:**
   - Choose when to trigger (e.g., "When an issue is created")
   - Add filters (e.g., environment = production)

3. **Set Actions:**
   - Select **"Send a notification via Discord"**
   - Choose your Discord integration

4. **Set Frequency:**
   - **Every time** - Get notified for every match
   - **Once per hour** - Get notified at most once per hour
   - **Once per day** - Get notified at most once per day

5. **Save Rule:**
   - Give it a name (e.g., "Critical Errors to Discord")
   - Click **"Save Rule"**

---

## 🎛️ Step 6: Fine-Tune Notifications

### Avoid Notification Fatigue

To prevent getting too many notifications:

1. **Use Filters:**
   - Only notify for production errors
   - Filter out known/ignored errors
   - Only notify for high-severity issues

2. **Set Frequency Limits:**
   - Use "Once per hour" or "Once per day" for non-critical alerts
   - Use "Every time" only for critical errors

3. **Create Separate Channels:**
   - **#critical-errors** - For fatal/error level issues (every time)
   - **#warnings** - For warning level issues (once per hour)
   - **#alerts-summary** - For daily summaries

### Notification Settings

In Sentry **Settings** → **Notifications**:

- **Personal Notifications:** Control what you get via email/Discord
- **Team Notifications:** Control team-wide notifications
- **Project Notifications:** Control project-specific notifications

---

## 🚨 Troubleshooting

### Not Receiving Discord Notifications

**Problem:** Discord notifications not appearing

**Solutions:**
1. **Verify Webhook URL:**
   - Check that the webhook URL is correct
   - Test the webhook URL manually (see below)

2. **Check Discord Channel Permissions:**
   - Ensure the webhook has permission to send messages
   - Check that the channel isn't muted

3. **Verify Alert Rules:**
   - Check that alert rules are enabled
   - Verify conditions are being met
   - Check that Discord is selected as an action

4. **Test Webhook Manually:**
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message from Sentry"}'
   ```
   - If this works, the webhook is valid
   - If not, create a new webhook

5. **Check Sentry Logs:**
   - Go to **Settings** → **Integrations** → **Discord**
   - Look for error messages or failed delivery logs

### Too Many Notifications

**Problem:** Getting spammed with Discord notifications

**Solutions:**
1. **Increase Frequency Limits:**
   - Change "Every time" to "Once per hour" or "Once per day"

2. **Add Filters:**
   - Only notify for production environment
   - Filter out low-severity issues
   - Ignore known/expected errors

3. **Create Separate Rules:**
   - Critical errors → "Every time"
   - Warnings → "Once per hour"
   - Info → "Once per day"

### Webhook URL Exposed

**Problem:** Webhook URL was accidentally committed to Git

**Solutions:**
1. **Immediately Revoke the Webhook:**
   - Go to Discord → Server Settings → Integrations → Webhooks
   - Delete the exposed webhook

2. **Create a New Webhook:**
   - Create a new webhook with a new URL
   - Update Sentry with the new URL

3. **Check Git History:**
   - If the URL was committed, consider it compromised
   - Rotate the webhook immediately

---

## 📚 Additional Resources

### Sentry Documentation
- [Sentry Integrations](https://docs.sentry.io/product/integrations/)
- [Sentry Alert Rules](https://docs.sentry.io/product/alerts/alert-rules/)
- [Sentry Webhooks](https://docs.sentry.io/product/integrations/integration-platform/webhooks/)

### Discord Documentation
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)
- [Discord Embed Formatting](https://discord.com/developers/docs/resources/channel#embed-object)

### Related Documentation
- `docs/Setup Docs/MONITORING_SETUP.md` - General monitoring setup
- `docs/Setup Docs/INFRASTRUCTURE_MONITORING_SETUP.md` - Infrastructure alerts
- `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Production checklist

---

## ✅ Verification Checklist

After setting up Discord notifications, verify:

- [ ] Discord webhook created and URL copied
- [ ] Discord integration added to Sentry
- [ ] Webhook URL configured in Sentry
- [ ] Test notification received in Discord
- [ ] Alert rules created for important events
- [ ] Notification frequency set appropriately
- [ ] Filters applied to avoid spam
- [ ] Production errors trigger Discord notifications
- [ ] Team members can see Discord notifications
- [ ] Webhook URL is NOT committed to Git

---

## 🎯 Next Steps

After setting up Discord notifications:

1. ✅ **Set up Alert Rules** - Configure when you want to be notified
2. ✅ **Test in Production** - Verify notifications work for real errors
3. ✅ **Fine-tune Frequency** - Adjust to avoid notification fatigue
4. ✅ **Document for Team** - Share Discord channel with team members
5. ✅ **Set up Additional Integrations** - Consider Slack, email, PagerDuty, etc.

---

**Status:** Ready for setup  
**Estimated Setup Time:** 10-15 minutes  
**Priority:** Optional but Recommended for Production

