# Discord Server Setup Guide

This guide covers setting up a Discord server for Digital Grimoire to handle Sentry alerts, feature updates, user communication, and community engagement.

## Table of Contents

1. [Overview](#overview)
2. [Server Creation](#server-creation)
3. [Channel Structure](#channel-structure)
4. [Sentry Integration](#sentry-integration)
5. [Discord Bot Setup (Optional)](#discord-bot-setup-optional)
6. [Environment Variables](#environment-variables)
7. [Roles & Permissions](#roles--permissions)
8. [Integration with Application](#integration-with-application)
9. [Next Steps](#next-steps)

---

## Overview

The Discord server serves three main purposes:

1. **Sentry Alerts** - Real-time error notifications from production
2. **Feature Updates** - Announcements and communication with end users
3. **Community Engagement** - Feature requests, book requests, and user support

---

## Server Creation

### Step 1: Create Discord Server

1. Open Discord and click the **"+"** icon in the left sidebar
2. Choose **"Create My Own"** → **"For a club or community"**
3. Name it: **"Digital Grimoire Community"** (or your preferred name)
4. Choose a region close to your users
5. Click **"Create"**

### Step 2: Server Settings

1. Go to **Server Settings** → **Overview**
2. Set server icon (optional but recommended)
3. Set server description: "Official community for Digital Grimoire - A convergence of esoteric wisdom and modern technology"
4. Set server region (choose closest to majority of users)

---

## Channel Structure

### Admin/Technical Channels

#### `#sentry-alerts` (Read-only for most users)
- **Purpose:** Sentry error notifications
- **Permissions:** Admins can post, everyone can read
- **Webhook:** Sentry integration sends alerts here
- **Settings:** 
  - Slow mode: Off
  - Auto-archive: Never

#### `#system-status` (Read-only for most users)
- **Purpose:** System health updates, deployment notifications
- **Permissions:** Admins can post, everyone can read
- **Settings:**
  - Slow mode: Off
  - Auto-archive: Never

#### `#deployments` (Read-only for most users)
- **Purpose:** Deployment notifications and changelog
- **Permissions:** Admins can post, everyone can read
- **Settings:**
  - Slow mode: Off
  - Auto-archive: After 1 week

### Community Channels

#### `#announcements` (Read-only for most users)
- **Purpose:** Feature updates, important news, major releases
- **Permissions:** Admins can post, everyone can read
- **Settings:**
  - Slow mode: Off
  - Auto-archive: Never
  - Pin important announcements

#### `#feature-requests` (Everyone can post)
- **Purpose:** User-submitted feature requests
- **Permissions:** Everyone can post and react
- **Settings:**
  - Slow mode: 30 seconds (prevents spam)
  - Auto-archive: After 1 month
  - **Suggested:** Use thread feature for each request

#### `#book-requests` (Everyone can post)
- **Purpose:** Requests for books/texts to be added to library
- **Permissions:** Everyone can post and react
- **Settings:**
  - Slow mode: 30 seconds
  - Auto-archive: After 1 month
  - **Suggested:** Use thread feature for each request

#### `#general` (Everyone can post)
- **Purpose:** General discussion about Digital Grimoire
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: Off
  - Auto-archive: After 1 week

#### `#help` (Everyone can post)
- **Purpose:** User support and questions
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: Off
  - Auto-archive: After 1 week

#### `#showcase` (Everyone can post)
- **Purpose:** Users sharing their grimoires, collections, and discoveries
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: Off
  - Auto-archive: After 1 month

### Optional Channels

#### `#bug-reports` (Everyone can post)
- **Purpose:** Bug reports and issues
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: 1 minute
  - Auto-archive: After 1 month

#### `#suggestions` (Everyone can post)
- **Purpose:** General suggestions and ideas
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: 30 seconds
  - Auto-archive: After 1 month

#### `#off-topic` (Everyone can post)
- **Purpose:** Casual chat unrelated to Digital Grimoire
- **Permissions:** Everyone can post
- **Settings:**
  - Slow mode: Off
  - Auto-archive: After 1 week

---

## Sentry Integration

### Option A: Using Sentry's Built-in Discord Integration (Recommended)

1. **In Sentry Dashboard:**
   - Go to **Settings** → **Integrations**
   - Search for **"Discord"**
   - Click **"Add Integration"**

2. **Create Discord Webhook:**
   - In Discord: **Server Settings** → **Integrations** → **Webhooks**
   - Click **"New Webhook"**
   - Name it: **"Sentry Alerts"**
   - Select channel: `#sentry-alerts`
   - Copy the **Webhook URL** (format: `https://discord.com/api/webhooks/...`)

3. **Configure in Sentry:**
   - Paste the webhook URL in Sentry integration settings
   - Configure alert rules:
     - **New issues** - Alert when new errors occur
     - **High error rates** - Alert when error rate exceeds threshold
     - **Performance degradation** - Alert on slow queries
   - Set severity filters (e.g., only errors and warnings)
   - Test the integration

### Option B: Custom Webhook Handler (More Control)

If you want more control over formatting, create a custom endpoint:

**File:** `app/src/app/api/discord/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_SENTRY_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const sentryEvent = await request.json();
    
    // Format Sentry event for Discord
    const discordMessage = {
      embeds: [{
        title: `🚨 ${sentryEvent.title || 'New Error'}`,
        description: sentryEvent.message || 'No message provided',
        color: 0xff0000, // Red
        fields: [
          {
            name: 'Environment',
            value: sentryEvent.environment || 'unknown',
            inline: true
          },
          {
            name: 'Level',
            value: sentryEvent.level || 'error',
            inline: true
          },
          {
            name: 'URL',
            value: sentryEvent.url || 'N/A',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Sentry Alert'
        }
      }]
    };

    // Send to Discord
    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMessage)
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discord webhook error:', error);
    return NextResponse.json({ error: 'Failed to send Discord notification' }, { status: 500 });
  }
}
```

Then configure Sentry to send webhooks to: `https://your-domain.com/api/discord/webhook`

---

## Discord Bot Setup (Optional)

A Discord bot can help with:
- Auto-moderation
- Feature request tracking
- Book request management
- Welcome messages
- Command handling

### Quick Bot Setup

1. **Create Bot Application:**
   - Go to https://discord.com/developers/applications
   - Click **"New Application"**
   - Name it: **"Digital Grimoire Bot"**
   - Go to **"Bot"** → **"Add Bot"**
   - Copy the **bot token** (keep it secret!)

2. **Invite Bot to Server:**
   - Go to **"OAuth2"** → **"URL Generator"**
   - Select scopes: `bot`, `applications.commands`
   - Select permissions:
     - `Send Messages`
     - `Embed Links`
     - `Manage Messages`
     - `Read Message History`
     - `Add Reactions`
   - Copy the generated URL and open it to invite the bot

3. **Basic Bot Code Structure:**

```typescript
// Example bot structure (would need a separate Node.js service)
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('messageCreate', async (message) => {
  // Handle feature requests
  if (message.channel.id === 'FEATURE_REQUESTS_CHANNEL_ID') {
    // Add reaction, log to database, etc.
  }
  
  // Handle book requests
  if (message.channel.id === 'BOOK_REQUESTS_CHANNEL_ID') {
    // Process book request
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

**Note:** Bot implementation is optional and can be deferred to Phase 5 (Community & Tokenomics).

---

## Environment Variables

Add to your `.env.local`:

```env
# Discord Webhooks
DISCORD_SENTRY_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
DISCORD_ANNOUNCEMENTS_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Discord Bot (if using)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

**Production (Vercel):**
1. Go to Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all Discord-related variables
4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

---

## Roles & Permissions

### Recommended Roles

#### `@Admin`
- Full access to all channels
- Can manage channels, roles, and members
- Can post in read-only channels

#### `@Moderator`
- Can manage messages
- Can delete messages
- Can manage threads
- Cannot manage channels or roles

#### `@Member`
- Default role for all users
- Can post in community channels
- Can read announcements and alerts

#### `@Beta Tester` (Optional)
- Early access to new features
- Access to `#beta-testing` channel
- Can provide feedback on unreleased features

### Permission Configuration

#### Read-Only Channels (`#sentry-alerts`, `#announcements`, `#system-status`)
- **@everyone:** Read messages only
- **@Admin:** Full access

#### Community Channels (`#feature-requests`, `#book-requests`, `#general`, `#help`)
- **@everyone:** Send messages, read messages, add reactions
- **@Moderator:** Manage messages, delete messages

---

## Integration with Application

### Add "Join Discord" Button

**File:** `app/src/components/DiscordInviteButton.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export function DiscordInviteButton() {
  const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || '#';
  
  return (
    <Button
      asChild
      variant="outline"
      className="gap-2"
    >
      <a 
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="h-4 w-4" />
        Join Discord Community
      </a>
    </Button>
  );
}
```

**Add to Footer or Header:**
- Footer: Add to social links section
- Header: Add to navigation menu (optional)

### Create Permanent Invite Link

1. In Discord: **Server Settings** → **Invites**
2. Create a new invite:
   - Set expiration to **"Never"**
   - Set max uses to **"No limit"** (or set a limit if preferred)
   - Copy the invite link
3. Add to environment variable: `NEXT_PUBLIC_DISCORD_INVITE_URL`

---

## Next Steps

### Immediate Actions

- [ ] Create Discord server
- [ ] Set up channel structure (all channels listed above)
- [ ] Create webhook for `#sentry-alerts`
- [ ] Configure Sentry → Discord integration
- [ ] Set up roles and permissions
- [ ] Create permanent invite link
- [ ] Add invite link to environment variables
- [ ] Add "Join Discord" button to application

### Post-Launch Enhancements

- [ ] Set up Discord bot for automation
- [ ] Create welcome message system
- [ ] Implement feature request tracking
- [ ] Add book request management system
- [ ] Set up auto-moderation rules
- [ ] Create custom commands for bot
- [ ] Integrate with application database (track requests)

---

## Troubleshooting

### Webhook Not Receiving Messages

1. **Verify webhook URL is correct:**
   - Check Discord webhook settings
   - Ensure URL is not expired

2. **Check Sentry integration:**
   - Verify Sentry project is connected
   - Test alert rule triggers

3. **Check permissions:**
   - Ensure webhook has permission to post in channel
   - Verify channel exists and is accessible

### Bot Not Responding

1. **Verify bot token:**
   - Check environment variable is set correctly
   - Ensure bot is invited to server

2. **Check bot permissions:**
   - Verify bot has required permissions
   - Check bot is online in server member list

3. **Review bot code:**
   - Check for errors in console
   - Verify event handlers are registered

---

## References

- [Discord Developer Portal](https://discord.com/developers/docs/intro)
- [Discord.js Documentation](https://discord.js.org/#/docs)
- [Sentry Discord Integration](https://docs.sentry.io/product/integrations/notification-incidents/sentry-apps/discord/)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)

---

## Status

**Current Status:** 📋 Planned  
**Priority:** P1 (Should Have)  
**Effort:** M (16-40 hours)  
**Sprint:** Phase 5 (Weeks 31-32)  
**Dependencies:** None

**Next Review:** When ready to implement community features

