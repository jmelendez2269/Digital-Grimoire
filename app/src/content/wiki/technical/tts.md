---
title: Text-to-Speech Engine
type: architecture
status: stable
audience: developer
description: Implementation details for the Text-to-Speech feature including Azure integration.
---

# Text-to-Speech (Read Aloud) Feature

## Overview

The Project Parallax now includes a comprehensive text-to-speech feature that allows users to listen to their documents being read aloud. This feature is perfect for:

- Long reading sessions where your eyes need a break
- Multitasking while consuming content
- Accessibility and enhanced learning experiences
- Proofreading and reviewing texts

## Features

### 🎯 Core Functionality

- **Floating Audio Player**: Persistent control bar that stays with you across all tabs
- **Dual Text Sources**: Choose between OCR-extracted text or PDF text extraction
- **Position Bookmarking**: Automatically saves your reading position
- **Text Highlighting**: See what's being read in real-time (in content tab)
- **Speed Control**: Adjust playback speed from 0.5x to 2.0x
- **Volume Control**: Fine-tune audio volume
- **Voice Selection**: Choose from multiple voices
- **Keyboard Shortcuts**: Quick controls for power users

### 🆓 Free Standard Voices

**Web Speech API (Default)**

- ✅ Completely free, unlimited usage
- ✅ Works offline
- ✅ Multiple voices (varies by operating system)
- ✅ Good quality for most use cases
- ✅ Zero setup required

**Best for**: General reading, testing the feature, offline usage

### ✨ Premium Neural Voices

**Azure Cognitive Services (Optional Upgrade)**

- ✅ 400+ natural-sounding neural voices
- ✅ 140+ languages and dialects
- ✅ Incredibly natural pronunciation and intonation
- ✅ First 5 million characters FREE per month (~3-4 complete books)
- ✅ Then just $1 per million characters

**Best for**: Long reading sessions, audiobook-quality experience, professional use

**Cost Examples**:

- Average book: ~1 million characters = FREE (or $1 if beyond free tier)
- Reading 3-4 books/month: $0 (within free tier)
- Heavy user (10 books/month): ~$5-6/month

## How to Use

### Getting Started

1. **Open any document** in your library
2. The **Audio Player** will appear at the bottom of the screen
3. Click the **Play button** to start reading

### Text Source Selection

- **OCR Text**: Read from pre-extracted OCR content (cleaner, faster)
- **PDF Text**: Extract text directly from PDF (matches visible content)
- Toggle between sources using the control buttons

### Playback Controls

| Control | Description |
|---------|-------------|
| Play/Pause | Start or pause reading |
| Stop | Stop reading and clear position |
| Speed Slider | Adjust reading speed (0.5x - 2.0x) |
| Volume Slider | Adjust audio volume |
| Voice Selector | Choose from available voices |
| Text Source | Switch between OCR and PDF text |
| Settings | Configure TTS engine and preferences |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `Esc` | Stop |
| `Ctrl + ↑/↓` | Increase/Decrease Volume |
| `Ctrl + ←/→` | Decrease/Increase Speed |

## Upgrading to Premium Voices

### Step 1: Get Azure Account

1. Visit [Azure Portal](https://azure.microsoft.com/en-us/free/)
2. Sign up for a free account (includes $200 credit + free services)
3. No credit card required for free tier

### Step 2: Create Speech Resource

1. In Azure Portal, create a new **Speech Services** resource
2. Select the Free (F0) tier to start (5M chars/month free)
3. Choose a region closest to you
4. Note your **API Key** and **Region**

### Step 3: Configure in Project Parallax

1. Click the **Settings icon** (⚙️) in the audio player
2. Select **"Premium Neural Voices"**
3. Enter your Azure API Key and Region
4. Click **Save Settings**

That's it! You now have access to premium voices.

## Tips & Best Practices

### Optimizing Your Experience

1. **Choose the Right Voice**: Experiment with different voices to find one that suits your preferences
2. **Adjust Speed**: Start at 1.0x and adjust based on content complexity
3. **Use Bookmarking**: Your position is saved automatically - you can come back anytime
4. **Text Highlighting**: Switch to the "Content" tab to see text highlighted as it's read
5. **Minimize Player**: Use the chevron button to collapse the player when you don't need the controls

### Performance Tips

- **OCR Text**: Generally faster and more reliable for scanned documents
- **PDF Text**: Better for text-based PDFs with complex layouts
- **Cache**: Text is cached after first extraction for faster subsequent plays

### Troubleshooting

**No voices available**

- Ensure your browser supports Web Speech API (Chrome, Edge, Safari, Firefox)
- Try reloading the page

**Azure voices not working**

- Verify your API key and region are correct
- Check your Azure subscription is active
- Ensure you haven't exceeded your quota

**Text extraction failed**

- Try switching between OCR and PDF text sources
- Some PDFs may not support text extraction (scanned images)
- Ensure the document status is "ready"

**Highlighting not working**

- Switch to the "Content" tab to see highlighting
- Highlighting only works with OCR text currently

## Privacy & Data

- **Standard Voices**: All processing happens locally in your browser. No data is sent anywhere.
- **Premium Voices**: Text is sent to Azure Speech Services for processing. Azure has enterprise-grade security and privacy protections.
- **Position Saving**: Reading positions are stored in your browser's local storage and our secure database.
- **API Keys**: Your Azure credentials are stored locally in your browser only.

## Technical Details

### Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Standard Voices | ✅ | ✅ | ✅ | ✅ |
| Premium Voices | ✅ | ✅ | ✅ | ✅ |
| Keyboard Shortcuts | ✅ | ✅ | ✅ | ✅ |
| Text Highlighting | ✅ | ✅ | ✅ | ✅ |

### Architecture

- **Web Speech API**: Browser native speech synthesis
- **Azure Speech SDK**: Microsoft Cognitive Services integration
- **PDF.js**: Text extraction from PDF documents
- **Local Storage**: Position bookmarking and preferences
- **Supabase**: Server-side position persistence

## Roadmap

Planned enhancements:

- [ ] PDF viewer text highlighting sync
- [ ] Speed presets (slow, normal, fast)
- [ ] Voice favorites and ratings
- [ ] Reading statistics and insights
- [ ] Mobile app support with background playback
- [ ] Download as audiobook (MP3)
- [ ] Multiple language support for non-English texts

## Support

Having issues or suggestions?

1. Check the troubleshooting section above
2. Visit our [GitHub Issues](https://github.com/your-repo/issues)
3. Contact support through the dashboard

## Cost Transparency

We believe in full transparency about costs:

**Free Features**:

- Standard voices (unlimited)
- Position bookmarking
- All playback controls
- Text highlighting

**Optional Premium**:

- Azure Neural Voices: $0-5/month for typical usage
- You can always switch back to free voices

We never charge markup on third-party services. If you use Azure, you pay Azure directly based on your usage.

---

**Enjoy your reading! 📖🔊**
