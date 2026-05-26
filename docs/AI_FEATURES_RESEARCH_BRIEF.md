# AI Features Research Brief

**Purpose.** A handoff document for a recurring deep-research pass. Each row is a real AI surface in the app; for each, the goal is the same: *what is the best model available right now for this use case at the best price?* The pass should be re-run on a schedule (suggested: monthly) because both pricing and frontier-model availability shift week-to-week.

**How to use this brief.** Hand the entire file to a deep-research agent and ask it to fill the "Research Output" column for each feature. Use the **Decision Criteria** at the bottom as the scoring rubric.

**Snapshot date.** 2026-05-26 (current models / prices in the table reflect what is wired in the codebase today, not a market recommendation).

---

## 1. Inventory of AI surfaces

### 1.1 Text generation — routed through `aiOrchestrator` + OpenRouter

All chat-style LLM calls funnel through [app/src/lib/ai/ai-orchestrator.ts](app/src/lib/ai/ai-orchestrator.ts) and default to OpenRouter via [app/src/lib/ai/openrouter-client.ts](app/src/lib/ai/openrouter-client.ts). Direct OpenAI / Anthropic / Google clients exist but are gated behind a model-prefix dispatch.

| # | Feature | Where | Current model (env override) | Latency tolerance | Quality bar | Volume profile |
|---|---|---|---|---|---|---|
| 1 | **Parallax Engine — multi-lens synthesis** (the headline feature) | [lens-orchestrator.ts](app/src/lib/parallax/lens-orchestrator.ts), [api/parallax/lens/[lensId]/route.ts](app/src/app/api/parallax/lens/%5BlensId%5D/route.ts) | `PARALLAX_SYNTHESIS_MODEL` / `PARALLAX_LENS_MODEL` → default `deepseek/deepseek-v4-flash:free` | User-facing, ≤6s per fanout | **High** — this is the brand. Voice, restraint, nuance all matter. | Fanout of N parallel calls per query (1 per active lens) + 1 synthesis call. Bursty per active user. |
| 2 | **Deep Search — library-grounded RAG synthesis** | [api/parallax/ai-search/route.ts](app/src/app/api/parallax/ai-search/route.ts) | Same default OpenRouter model. JSON-mode, `temperature: 0.3`. | ≤8s, cached | High — must return valid JSON with `book_id` citations from supplied context. | Cached per normalized query; cold queries hit hard. |
| 3 | **Document metadata extraction** (title/author/year/type/lens/tags/summaries on upload) | [claude-metadata.ts](app/src/lib/claude-metadata.ts), [api/metadata/extract](app/src/app/api/metadata/extract/route.ts), [api/documents/generate-metadata](app/src/app/api/documents/generate-metadata/route.ts), [api/documents/rescan-all-metadata](app/src/app/api/documents/rescan-all-metadata/route.ts) | `OPENROUTER_METADATA_MODEL` → default `deepseek/deepseek-v4-flash:free`. JSON-mode, `temperature: 0.3`, 3000-char OCR window. | Batchable, async OK | Medium — structured JSON, schema is forgiving, but `standardizedId` and `lenses` array correctness matter. | Per-upload + bulk rescan jobs over 100s–1000s of docs. |
| 4 | **Chapter name generation** | [api/chapters/generate-names/route.ts](app/src/app/api/chapters/generate-names/route.ts) | `OPENROUTER_METADATA_MODEL`. JSON-mode, `temperature: 0.3`. | Async, ≤30s | Low–Medium — short titles, structural task. | Per-upload, batched per volume. |
| 5 | **Concept-search AI relevance scoring** | [lib/concepts/ai-relevance.ts](app/src/lib/concepts/ai-relevance.ts) | OpenRouter default. Up to 20 concepts per call, JSON `{conceptId, score, reasoning}`. | ≤2s (search UX) | Medium — only fires on ambiguous queries. | Sparse; only ambiguous searches. |
| 6 | **Reader's Digest drafting** (per-reading 600–1300 word artifact) | [scripts/draft-reading-blurbs.ts](app/scripts/draft-reading-blurbs.ts) | `READING_BLURB_MODEL` → default `claude-sonnet-4-6` (direct Anthropic SDK, **uses prompt caching**) | Offline script | **Very high** — student-facing pedagogical writing, banned-phrase voice rules, strict length. | Hundreds of readings; re-run when curriculum changes. |
| 7 | **Curator note + long-summary rewrite** | [scripts/rewrite-curator-notes.ts](app/scripts/rewrite-curator-notes.ts) | `CURATOR_REWRITE_MODEL` → default `claude-sonnet-4-6` (direct Anthropic SDK) | Offline script | Very high — same voice rules as digests, also generates `relatedTexts` cross-links. | Hundreds of texts. |
| 8 | **Generic AI chat endpoints** (`/api/ai/claude`, `/api/ai/gpt`, `/api/ai/gemini`) backing `AIChatModal` | [api/ai/{claude,gpt,gemini}/route.ts](app/src/app/api/ai/), [components/AIChatModal.tsx](app/src/components/AIChatModal.tsx) | All three currently route to OpenRouter default. The "model picker" in the UI is cosmetic — the backend ignores it. | User-facing chat | Medium | Per-conversation; rate-limited. |
| 9 | **Consensus chat** (multi-model fanout + synthesis) | `aiOrchestrator.consensusChat` in [ai-orchestrator.ts](app/src/lib/ai/ai-orchestrator.ts) | Currently iterates over `[getDefaultOpenRouterModel()]` — a one-element list. Originally designed for true cross-model consensus; currently degenerate. | n/a — not actively shipped | High when real | Sparse |

### 1.2 Embeddings

| # | Feature | Where | Current model | Notes |
|---|---|---|---|---|
| 10 | **Text chunk + summary embeddings** (powers hybrid search / RAG) | [lib/parallax/embeddings.ts](app/src/lib/parallax/embeddings.ts) | `text-embedding-3-small` @ 1536 dims, direct OpenAI client | Volume: every uploaded text, chunked. Backfill jobs available. pgvector in Supabase. |

### 1.3 OCR

| # | Feature | Where | Current model | Notes |
|---|---|---|---|---|
| 11 | **PDF OCR** | [lib/ocr.ts](app/src/lib/ocr.ts) | `MISTRAL_OCR_MODEL` → `mistral-ocr-latest` via direct REST | Mistral pulls the URL itself; pricing per page. |
| 12 | **Image OCR** | [lib/ocr.ts](app/src/lib/ocr.ts) → [lib/utils/local-ocr.ts](app/src/lib/utils/local-ocr.ts) | Local Tesseract | Free, runs on the function. Quality ceiling. |

### 1.4 Speech-to-text

| # | Feature | Where | Current model | Notes |
|---|---|---|---|---|
| 13 | **Audio/video transcription** | [lib/transcript-generator.ts](app/src/lib/transcript-generator.ts) | OpenAI `whisper-1` via REST, `verbose_json` with segments | One-shot per media upload. |

### 1.5 Text-to-speech

| # | Feature | Where | Current engine | Notes |
|---|---|---|---|---|
| 14 | **Reader TTS** | [lib/services/tts-service.ts](app/src/lib/services/tts-service.ts), [azure-speech-tts.ts](app/src/lib/services/azure-speech-tts.ts), [web-speech-tts.ts](app/src/lib/services/web-speech-tts.ts) | Two engines: **Azure Neural** (premium, curated voice list `en-US-AriaNeural` etc.) and browser Web Speech API (free fallback). | High per-character cost on premium tier. Long-form reading = thousands of characters per session. |

### 1.6 Image generation

| # | Feature | Where | Current model | Notes |
|---|---|---|---|---|
| 15 | **Book cover generation** — primary path | [lib/getimg-cover.ts](app/src/lib/getimg-cover.ts) | getimg.ai FLUX.1 [schnell], ~$0.00252 / 1024² | Used in [api/process-document](app/src/app/api/process-document/route.ts) and [api/process-media](app/src/app/api/process-media/route.ts). |
| 16 | **Book cover generation** — Replicate fallback | [lib/replicate-cover.ts](app/src/lib/replicate-cover.ts) | Replicate FLUX/SD family | Pay-per-use. |
| 17 | **Book cover generation** — Gemini SVG path | [lib/nano-banana-cover.ts](app/src/lib/nano-banana-cover.ts) | Tries `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-*` in fallback chain. Generates **SVG code**, not raster. | Quirky path — model is a text LLM emitting SVG, not an image model. |
| 18 | **Tarot card generation** | [api/practitioner/tarot/generate/route.ts](app/src/app/api/practitioner/tarot/generate/route.ts) | OpenAI `dall-e-3`, 1024×1024, `response_format: b64_json`, `maxDuration: 60` | User-facing, per-card. Significant cost per generation. |

---

## 2. Per-feature research brief

For each numbered feature above, the deep-research agent should return:

1. **Recommended primary model** (vendor + exact ID + endpoint/region notes)
2. **Recommended fallback model** (for failover; ideally a different vendor)
3. **Why this beats the current model** for *this specific use case* — cite latency, quality, context window, JSON-mode reliability, voice/style behavior, image fidelity, language coverage, whatever is load-bearing for this feature.
4. **Price math at our volume tier.** Use the volume profile column. Format: input $/Mtok, output $/Mtok, plus an estimated $/1000 calls or $/1000 covers at our typical payload sizes.
5. **Migration cost** — drop-in via OpenRouter? New SDK? New auth? Different prompt template needed? Different JSON-mode contract?
6. **Watchlist** — newer model expected within ~3 months that might leapfrog this recommendation.

### 2.1 Special asks per category

**For the synthesis features (#1, #2, #6, #7):** voice matters. Test prompts should evaluate whether the model:
- Avoids the banned phrases listed in [draft-reading-blurbs.ts](app/scripts/draft-reading-blurbs.ts) (stealth-adverb constructions like "quietly devastating", back-cover sludge like "essential reading", "seminal", "cornerstone").
- Avoids formulaic openers ("The concept of X is multifaceted...", "It is important to note...").
- Honors the equanimity principle in the lens-synthesis system prompt (does not artificially resolve tensions between perspectives, does not rank lenses).
- Holds 600–1300 word length window without padding or truncating.

**For metadata features (#3, #4, #5):** JSON-mode reliability is the dominant criterion. We currently lean on `response_format: { type: 'json_object' }` plus a repair pass ([lib/ai/json.ts](app/src/lib/ai/json.ts)). Free DeepSeek tier failure rate / latency-under-load is a real cost we're paying in retry logic — quantify it.

**For embeddings (#10):** evaluate `text-embedding-3-large` (better recall at higher cost), Cohere v4, Voyage v3, and consider whether moving to a 768-dim or 3072-dim space is worth the storage + reindex cost. We have pgvector locked at 1536 today — migration cost is non-trivial.

**For OCR (#11, #12):** Mistral OCR pricing per page is the headline cost on bulk uploads. Compare to Google Document AI, AWS Textract, and the new Gemini 2.x file/PDF APIs. For images, evaluate whether Mistral OCR / Gemini Vision / a vision-capable Claude beats local Tesseract enough to justify the per-call cost.

**For Whisper (#13):** check the Whisper-large-v3 hosted offerings (Groq, Fireworks, Deepgram Nova-3) — they often beat OpenAI on both latency and price for the same accuracy.

**For TTS (#14):** the per-character cost on long-form reading is the killer. Evaluate ElevenLabs Turbo v2.5, OpenAI `tts-1-hd`, Cartesia Sonic, Deepgram Aura, and Google Chirp 3. We need natural prosody for sacred-text reading — robotic voices break the immersion.

**For image generation (#15–#18):**
- For covers: the design brief is "Dark Academia / vintage hardcover / mystical." Evaluate FLUX.1 [dev] vs [schnell] vs FLUX 1.1 Pro, SDXL, Ideogram (text-on-image strength), and Recraft (vector / SVG output, relevant to the Gemini SVG path).
- For tarot: DALL-E 3's mystical-aesthetic quality vs current alternatives. Note: gpt-image-1 (replaces DALL-E 3) is a possible upgrade path.

---

## 3. Decision criteria (scoring rubric for the research agent)

Score each candidate model 1–5 on:

1. **Quality fit for the specific task** (weight ×3)
2. **Cost at projected volume** (weight ×2) — quoted in $/1000 calls or $/1000 covers, not raw $/Mtok
3. **Latency p50 / p95** (weight ×2)
4. **JSON-mode / structured-output reliability** (weight ×2 for metadata tasks, ×1 elsewhere)
5. **Availability via OpenRouter** (weight ×1 — drop-in beats new SDK)
6. **Provider stability / track record** (weight ×1)
7. **Watchlist risk** — likelihood a strictly better+cheaper model lands in <90 days (weight ×1, *negative*)

**Output format the research agent should return:**

```
Feature #N: <name>
  Recommended: <vendor>/<model-id>      [score: X.X / 5]
  Fallback:    <vendor>/<model-id>      [score: X.X / 5]
  Current:     <model currently wired>  [score: X.X / 5]
  Δ cost:      <+/- $X per 1000 calls at our volume>
  Δ quality:   <one-sentence delta>
  Migration:   <effort: drop-in / prompt-tune / SDK-swap / schema-change>
  Watchlist:   <model X expected Q3 2026, may invalidate this rec>
```

---

## 4. Open architectural questions worth flagging

These aren't model questions, but the research agent should raise them if the answers materially change the cost picture:

- **Vercel AI Gateway** (GA Aug 2025) provides unified routing, observability, model fallback, and zero data retention across providers. Switching from raw OpenRouter to AI Gateway may consolidate billing and unlock per-feature routing rules. Worth a section in the research output.
- The three `/api/ai/{claude,gpt,gemini}` endpoints all currently route to the same OpenRouter default — the UI's model picker is non-functional. Either fix it (route to actual provider) or remove the picker.
- `consensusChat` is degenerate (single-element model array). Either re-enable real cross-model consensus or delete the function.
- Direct OpenAI/Anthropic/Google clients in [ai-orchestrator.ts](app/src/lib/ai/ai-orchestrator.ts) are unused in the current default routing path. They add three SDK dependencies and three env vars. Decide: keep for emergency direct access, or remove?
- Prompt caching is already enabled in the Reader's Digest script (#6) via `cache_control: { type: 'ephemeral' }` on the system block. For #1 (lens synthesis), system prompts are large and **identical across the fanout** — prompt caching could materially cut cost. Check whether the current routing path supports it on the chosen provider.

---

## 5. How to run this on a schedule

This brief is meant to be re-run as inputs change (pricing, frontier launches). Suggested cadence: **monthly**, or whenever a major provider ships a new model family.

Each run should produce a dated companion file (e.g. `docs/AI_FEATURES_RESEARCH_2026-06.md`) so deltas are reviewable.
