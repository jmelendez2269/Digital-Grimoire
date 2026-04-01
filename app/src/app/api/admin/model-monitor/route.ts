import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Known model catalog — ground truth for what's available today.
// Update this table when providers release new models.
// ---------------------------------------------------------------------------
const KNOWN_MODELS: ModelCatalogEntry[] = [
  // OpenAI
  { provider: 'openai', model: 'gpt-4o-mini',    inputCost: 0.15,  outputCost: 0.60,  notes: 'Fast, cheap. Good for classification & simple extraction.' },
  { provider: 'openai', model: 'gpt-4o',          inputCost: 2.50,  outputCost: 10.00, notes: 'Flagship multimodal.' },
  { provider: 'openai', model: 'gpt-4.1',         inputCost: 2.00,  outputCost: 8.00,  notes: 'Latest OpenAI model — upgraded reasoning, cheaper than gpt-4o.' },
  { provider: 'openai', model: 'gpt-4.1-mini',    inputCost: 0.40,  outputCost: 1.60,  notes: 'Cheap, fast — consider for lens tasks currently on gpt-4o-mini.' },
  { provider: 'openai', model: 'o4-mini',         inputCost: 1.10,  outputCost: 4.40,  notes: 'Reasoning model. Strong at math & symbolic tasks.' },
  { provider: 'openai', model: 'text-embedding-3-small', inputCost: 0.02, outputCost: null, notes: 'Current embeddings model.' },
  { provider: 'openai', model: 'text-embedding-3-large', inputCost: 0.13, outputCost: null, notes: 'Higher quality embeddings.' },
  // Anthropic
  { provider: 'anthropic', model: 'claude-3-5-sonnet-latest', inputCost: 3.00,  outputCost: 15.00, notes: 'Current production model.' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-latest',  inputCost: 0.80,  outputCost: 4.00,  notes: 'Fast, affordable — potential drop-in for some lenses.' },
  { provider: 'anthropic', model: 'claude-opus-4-6',          inputCost: 15.00, outputCost: 75.00, notes: 'Flagship Claude — overkill for most lens tasks.' },
  { provider: 'anthropic', model: 'claude-sonnet-4-6',        inputCost: 3.00,  outputCost: 15.00, notes: 'Latest Sonnet — same price tier as 3.5 Sonnet.' },
  // Google
  { provider: 'google', model: 'gemini-1.5-pro',          inputCost: 1.25, outputCost: 5.00,  notes: 'Current production model.' },
  { provider: 'google', model: 'gemini-1.5-flash',         inputCost: 0.075, outputCost: 0.30, notes: 'Very cheap; consider for lens tasks.' },
  { provider: 'google', model: 'gemini-2.0-flash',         inputCost: 0.10,  outputCost: 0.40, notes: 'Faster and cheaper than 1.5 Pro.' },
  { provider: 'google', model: 'gemini-2.5-pro',           inputCost: 1.25,  outputCost: 10.00, notes: 'Latest Gemini flagship — stronger reasoning.' },
  // Microsoft / Azure
  { provider: 'microsoft', model: 'azure-neural-tts', inputCost: null, outputCost: null, notes: '$16 per 1M characters. Monitor: Azure, ElevenLabs, OpenAI TTS.' },
];

// ---------------------------------------------------------------------------
// Platform model config — what we are currently running in production.
// This is the source of truth for the monitor's "current" state.
// ---------------------------------------------------------------------------
const PLATFORM_CONFIG: PlatformModel[] = [
  { useCase: 'Lens: Scientific',     provider: 'openai',     model: 'gpt-4o-mini',              inputCost: 0.15,  outputCost: 0.60 },
  { useCase: 'Lens: Psychological',  provider: 'anthropic',  model: 'claude-3-5-sonnet-latest', inputCost: 3.00,  outputCost: 15.00 },
  { useCase: 'Lens: Philosophical',  provider: 'anthropic',  model: 'claude-3-5-sonnet-latest', inputCost: 3.00,  outputCost: 15.00 },
  { useCase: 'Lens: Religious',      provider: 'google',     model: 'gemini-1.5-pro',           inputCost: 1.25,  outputCost: 5.00 },
  { useCase: 'Lens: Historical',     provider: 'google',     model: 'gemini-1.5-pro',           inputCost: 1.25,  outputCost: 5.00 },
  { useCase: 'Lens: Symbolic',       provider: 'anthropic',  model: 'claude-3-5-sonnet-latest', inputCost: 3.00,  outputCost: 15.00 },
  { useCase: 'Lens: Mathematical',   provider: 'openai',     model: 'gpt-4o-mini',              inputCost: 0.15,  outputCost: 0.60 },
  { useCase: 'Synthesis Merge',      provider: 'openai',     model: 'gpt-4o',                   inputCost: 2.50,  outputCost: 10.00 },
  { useCase: 'Journal AI',           provider: 'openai',     model: 'gpt-4o-mini',              inputCost: 0.15,  outputCost: 0.60 },
  { useCase: 'Embeddings',           provider: 'openai',     model: 'text-embedding-3-small',   inputCost: 0.02,  outputCost: null },
  { useCase: 'Related Terms',        provider: 'openai',     model: 'gpt-4o',                   inputCost: 2.50,  outputCost: 10.00 },
  { useCase: 'Text-to-Speech',       provider: 'microsoft',  model: 'azure-neural-tts',         inputCost: null,  outputCost: null },
];

// ---------------------------------------------------------------------------
// Deprecation warnings (hardcoded from provider changelog monitoring).
// Update this list when providers announce deprecations.
// ---------------------------------------------------------------------------
const DEPRECATION_NOTICES: DeprecationNotice[] = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    deprecationDate: null,
    replacement: 'gpt-4.1',
    note: 'gpt-4o is still active but gpt-4.1 is newer, cheaper, and stronger. Consider migrating Synthesis Merge and Related Terms.',
    severity: 'HIGH',
  },
  {
    provider: 'google',
    model: 'gemini-1.5-pro',
    deprecationDate: '2025-09-24',
    replacement: 'gemini-2.0-flash or gemini-2.5-pro',
    note: 'Gemini 1.5 Pro is deprecated. Migrate Lens: Religious and Lens: Historical immediately.',
    severity: 'URGENT',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    deprecationDate: null,
    replacement: 'claude-sonnet-4-6',
    note: 'Claude 3.5 Sonnet is still active. claude-sonnet-4-6 (same price) is the latest generation.',
    severity: 'HIGH',
  },
];

// ---------------------------------------------------------------------------
// Load platform config from DB, falling back to hardcoded seed data.
// Uses the service client so cron calls (no user session) can read the table.
// ---------------------------------------------------------------------------
async function loadPlatformConfig(): Promise<PlatformModel[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('platform_model_config')
    .select('use_case, provider, model_name, input_cost_per_1m, output_cost_per_1m')
    .order('use_case');
  if (error) {
    console.error('[MODEL MONITOR] Failed to load platform_model_config from DB, using hardcoded fallback:', error.message);
    return PLATFORM_CONFIG;
  }
  if (!data || data.length === 0) {
    return PLATFORM_CONFIG;
  }
  return data.map((row) => ({
    useCase: row.use_case,
    provider: row.provider,
    model: row.model_name,
    inputCost: row.input_cost_per_1m != null ? Number(row.input_cost_per_1m) : null,
    outputCost: row.output_cost_per_1m != null ? Number(row.output_cost_per_1m) : null,
  }));
}

// ---------------------------------------------------------------------------
// Recommendations engine — compares current config against known models.
// ---------------------------------------------------------------------------
function generateRecommendations(config: PlatformModel[]): Recommendation[] {
  const recs: Recommendation[] = [];

  // gpt-4o → gpt-4.1 (cheaper, better)
  const gpt4oUsers = config.filter(m => m.model === 'gpt-4o');
  if (gpt4oUsers.length > 0) {
    recs.push({
      severity: 'HIGH',
      useCase: gpt4oUsers.map(m => m.useCase).join(', '),
      recommendation: 'Replace gpt-4o with gpt-4.1',
      reasoning: 'gpt-4.1 is newer, cheaper ($2.00/$8.00 vs $2.50/$10.00 per 1M), and has stronger reasoning. Estimated 20% cost savings on Synthesis Merge and Related Terms.',
    });
  }

  // gpt-4o-mini → gpt-4.1-mini (better quality, slightly more expensive but newer)
  const miniUsers = config.filter(m => m.model === 'gpt-4o-mini');
  if (miniUsers.length > 0) {
    recs.push({
      severity: 'LOW',
      useCase: miniUsers.map(m => m.useCase).join(', '),
      recommendation: 'Evaluate gpt-4.1-mini as a replacement for gpt-4o-mini',
      reasoning: 'gpt-4.1-mini ($0.40/$1.60 per 1M) is 2.5× the price of gpt-4o-mini but significantly more capable. Test quality on lens tasks before deciding.',
    });
  }

  // gemini-1.5-pro → gemini-2.0-flash (URGENT: deprecated)
  const geminiUsers = config.filter(m => m.model === 'gemini-1.5-pro');
  if (geminiUsers.length > 0) {
    recs.push({
      severity: 'URGENT',
      useCase: geminiUsers.map(m => m.useCase).join(', '),
      recommendation: 'Migrate from gemini-1.5-pro to gemini-2.0-flash immediately',
      reasoning: 'gemini-1.5-pro was deprecated September 2024. gemini-2.0-flash ($0.10/$0.40) is 12× cheaper and faster. Run A/B quality test on lens outputs first.',
    });
  }

  // claude-3-5-sonnet → claude-sonnet-4-6 (same price, newer)
  const claudeUsers = config.filter(m => m.model === 'claude-3-5-sonnet-latest');
  if (claudeUsers.length > 0) {
    recs.push({
      severity: 'HIGH',
      useCase: claudeUsers.map(m => m.useCase).join(', '),
      recommendation: 'Upgrade claude-3-5-sonnet-latest to claude-sonnet-4-6',
      reasoning: 'claude-sonnet-4-6 is the latest generation at the same price ($3/$15 per 1M). No cost impact, stronger reasoning and context handling.',
    });
  }

  // Embedding upgrade option
  const embeddingUsers = config.filter(m => m.model === 'text-embedding-3-small');
  if (embeddingUsers.length > 0) {
    recs.push({
      severity: 'LOW',
      useCase: 'Embeddings',
      recommendation: 'Consider text-embedding-3-large for higher recall',
      reasoning: 'text-embedding-3-large ($0.13/1M) is 6× the cost but significantly higher MTEB scores. Worth testing if parallax search recall feels weak.',
    });
  }

  // o4-mini for mathematical lens
  const mathUsers = config.filter(m => m.useCase === 'Lens: Mathematical');
  if (mathUsers.length > 0) {
    recs.push({
      severity: 'LOW',
      useCase: 'Lens: Mathematical',
      recommendation: 'Test o4-mini for mathematical lens',
      reasoning: 'o4-mini ($1.10/$4.40 per 1M) is a reasoning model that excels at math. May produce significantly better outputs for the mathematical lens despite being ~7× more expensive than gpt-4o-mini.',
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Report generator
// ---------------------------------------------------------------------------
function buildMarkdownReport(params: ReportParams): string {
  const { config, deprecations, recommendations, monthlyCost, priceChanges, reportDate } = params;

  const urgentAlerts = [
    ...deprecations.filter(d => d.severity === 'URGENT'),
    ...recommendations.filter(r => r.severity === 'URGENT'),
  ];

  const lines: string[] = [];
  lines.push(`# AI Model Monitor Report`);
  lines.push(`Generated: ${reportDate}`);
  lines.push('');

  // Alert banner
  if (urgentAlerts.length > 0) {
    lines.push(`> ⚠️ **${urgentAlerts.length} URGENT alert(s) require immediate action.** See Deprecation Warnings and Recommendations sections below.`);
    lines.push('');
  }

  // Price changes
  lines.push('## Price Changes Detected');
  if (priceChanges.length > 0) {
    lines.push('| Model | Old Price (in/out) | New Price (in/out) | Monthly Impact |');
    lines.push('|-------|-------------------|-------------------|----------------|');
    for (const change of priceChanges) {
      lines.push(`| ${change.model} | $${change.oldInput}/$${change.oldOutput} | $${change.newInput}/$${change.newOutput} | ${change.impact} |`);
    }
  } else {
    lines.push('No price changes detected since last report.');
  }
  lines.push('');

  // New model releases
  lines.push('## New Model Releases');
  lines.push('| Provider | Model | Available Since | Replaces | Status |');
  lines.push('|----------|-------|-----------------|----------|--------|');
  lines.push('| OpenAI   | gpt-4.1 | Apr 2025 | gpt-4o | 🟡 Test recommended |');
  lines.push('| OpenAI   | gpt-4.1-mini | Apr 2025 | gpt-4o-mini | 🟡 Test recommended |');
  lines.push('| OpenAI   | o4-mini | Apr 2025 | — | 🟡 Test for math lens |');
  lines.push('| Google   | gemini-2.5-pro | Mar 2025 | gemini-1.5-pro | 🔴 Migration required |');
  lines.push('| Google   | gemini-2.0-flash | Feb 2025 | gemini-1.5-pro | 🔴 Migration required |');
  lines.push('| Anthropic | claude-sonnet-4-6 | Mar 2026 | claude-3-5-sonnet | 🟡 Upgrade recommended |');
  lines.push('');

  // Deprecation warnings
  lines.push('## Deprecation Warnings');
  const urgentDeps = deprecations.filter(d => d.severity === 'URGENT');
  const otherDeps = deprecations.filter(d => d.severity !== 'URGENT');
  if (urgentDeps.length + otherDeps.length === 0) {
    lines.push('No active deprecation warnings.');
  } else {
    lines.push('| Model | Severity | Deprecation Date | Replacement | Action Required |');
    lines.push('|-------|----------|-----------------|-------------|-----------------|');
    for (const dep of [...urgentDeps, ...otherDeps]) {
      const badge = dep.severity === 'URGENT' ? '🔴 URGENT' : dep.severity === 'HIGH' ? '🟠 HIGH' : '🟡 MEDIUM';
      lines.push(`| ${dep.provider}/${dep.model} | ${badge} | ${dep.deprecationDate ?? 'No date set'} | ${dep.replacement} | ${dep.note} |`);
    }
  }
  lines.push('');

  // Cost summary
  lines.push('## Cost Summary (Current Month)');
  if (monthlyCost) {
    lines.push(`**Total this month:** $${monthlyCost.total.toFixed(4)}`);
    lines.push('');
    lines.push('| Use Case | Model | Estimated Monthly Cost |');
    lines.push('|----------|-------|----------------------|');
    for (const row of config) {
      const avgCost = row.inputCost ? `~$${((row.inputCost + (row.outputCost ?? 0)) / 2).toFixed(3)}/1M tokens` : 'See provider billing';
      lines.push(`| ${row.useCase} | ${row.model} | ${avgCost} |`);
    }
  } else {
    lines.push('Monthly cost data not available. Check the AI Usage Dashboard for actual spend.');
    lines.push('');
    lines.push('| Use Case | Model | List Price |');
    lines.push('|----------|-------|-----------|');
    for (const row of config) {
      const price = row.inputCost != null
        ? `$${row.inputCost}/$${row.outputCost ?? 'N/A'} per 1M in/out`
        : 'See provider billing';
      lines.push(`| ${row.useCase} | ${row.model} | ${price} |`);
    }
  }
  lines.push('');

  // Recommendations
  lines.push('## Recommendations');
  const byPriority = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  for (const priority of byPriority) {
    const group = recommendations.filter(r => r.severity === priority);
    for (const rec of group) {
      const badge = priority === 'URGENT' ? '🔴' : priority === 'HIGH' ? '🟠' : priority === 'MEDIUM' ? '🟡' : '🔵';
      lines.push(`- **[${badge} ${priority}]** **${rec.useCase}**: ${rec.recommendation}`);
      lines.push(`  - *Reasoning:* ${rec.reasoning}`);
    }
  }
  if (recommendations.length === 0) {
    lines.push('No recommendations at this time. All models are up-to-date.');
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('*This report is generated automatically every Monday at 09:00 UTC by the AI Model Monitor cron job.*');
  lines.push('*Models are never auto-switched. All changes require manual review and approval.*');
  lines.push(`*Next scheduled run: next Monday 09:00 UTC*`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// GET: fetch the latest report and model config
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'config') {
    // Return the platform model config from DB
    const { data: config } = await supabase
      .from('platform_model_config')
      .select('*')
      .order('use_case');
    return NextResponse.json({ success: true, config: config ?? [] });
  }

  if (action === 'reports') {
    // Return recent reports list
    const { data: reports } = await supabase
      .from('model_monitor_reports')
      .select('id, report_date, price_changes_detected, new_models_detected, deprecations_detected, urgent_alerts, created_at')
      .order('report_date', { ascending: false })
      .limit(12);
    return NextResponse.json({ success: true, reports: reports ?? [] });
  }

  if (action === 'report') {
    // Return a specific report's markdown
    const id = searchParams.get('id');
    if (!id) {
      // Return latest
      const { data: report } = await supabase
        .from('model_monitor_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(1)
        .single();
      return NextResponse.json({ success: true, report: report ?? null });
    }
    const { data: report } = await supabase
      .from('model_monitor_reports')
      .select('*')
      .eq('id', id)
      .single();
    return NextResponse.json({ success: true, report: report ?? null });
  }

  // Default: return overview summary
  const { data: latestReport } = await supabase
    .from('model_monitor_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .limit(1)
    .single();

  const { data: recentReports } = await supabase
    .from('model_monitor_reports')
    .select('id, report_date, price_changes_detected, new_models_detected, deprecations_detected, urgent_alerts, created_at')
    .order('report_date', { ascending: false })
    .limit(8);

  const currentConfig = await loadPlatformConfig();

  return NextResponse.json({
    success: true,
    latestReport: latestReport ?? null,
    recentReports: recentReports ?? [],
    currentConfig,
    knownModels: KNOWN_MODELS,
    pendingDeprecations: DEPRECATION_NOTICES,
    pendingRecommendations: generateRecommendations(currentConfig),
  });
}

// POST: run the monitor (triggered by cron or manual admin action)
export async function POST(request: NextRequest) {
  // Allow cron calls via CRON_SECRET header, or authenticated admin users
  const cronSecret = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  const isCronCall = cronSecret === process.env.CRON_SECRET && !!process.env.CRON_SECRET;

  if (!isCronCall) {
    // Fall back to admin session auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = await createClient();
  const reportDate = new Date().toISOString().split('T')[0];

  console.log(`[MODEL MONITOR] Starting run for ${reportDate}`);

  // --- Step 1: Load last known pricing from DB to detect changes ---
  const { data: lastPricing } = await supabase
    .from('model_pricing_history')
    .select('*')
    .order('recorded_at', { ascending: false });

  const lastPricingMap = new Map<string, { inputCost: number | null; outputCost: number | null }>();
  if (lastPricing) {
    for (const row of lastPricing) {
      const key = `${row.provider}:${row.model_name}`;
      if (!lastPricingMap.has(key)) {
        lastPricingMap.set(key, { inputCost: row.input_cost_per_1m, outputCost: row.output_cost_per_1m });
      }
    }
  }

  // --- Step 2: Detect price changes by comparing known catalog to DB history ---
  const priceChanges: PriceChange[] = [];
  for (const model of KNOWN_MODELS) {
    const key = `${model.provider}:${model.model}`;
    const last = lastPricingMap.get(key);
    if (last && model.inputCost !== null) {
      if (last.inputCost !== model.inputCost || last.outputCost !== model.outputCost) {
        const oldInput = last.inputCost ?? 0;
        const newInput = model.inputCost ?? 0;
        const pctChange = oldInput > 0 ? ((newInput - oldInput) / oldInput) * 100 : 0;
        priceChanges.push({
          model: `${model.provider}/${model.model}`,
          oldInput: last.inputCost,
          oldOutput: last.outputCost,
          newInput: model.inputCost,
          newOutput: model.outputCost,
          impact: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}% input price change`,
        });
      }
    }
  }

  // --- Step 3: Record current pricing snapshot ---
  const pricingRows = KNOWN_MODELS.filter(m => m.inputCost !== null).map(m => ({
    provider: m.provider,
    model_name: m.model,
    input_cost_per_1m: m.inputCost,
    output_cost_per_1m: m.outputCost,
    source_url: getPricingUrl(m.provider),
  }));

  await supabase.from('model_pricing_history').insert(pricingRows);

  // --- Step 4: Generate recommendations ---
  const platformConfig = await loadPlatformConfig();
  const recommendations = generateRecommendations(platformConfig);
  const deprecations = DEPRECATION_NOTICES;

  // --- Step 5: Build report ---
  const report = buildMarkdownReport({
    config: platformConfig,
    deprecations,
    recommendations,
    monthlyCost: null, // Would wire to api_usage in future
    priceChanges,
    reportDate,
  });

  const urgentAlerts = [
    ...deprecations.filter(d => d.severity === 'URGENT').map(d => ({
      type: 'deprecation',
      severity: d.severity,
      message: `${d.provider}/${d.model}: ${d.note}`,
    })),
    ...recommendations.filter(r => r.severity === 'URGENT').map(r => ({
      type: 'recommendation',
      severity: r.severity,
      message: `${r.useCase}: ${r.recommendation}`,
    })),
  ];

  // --- Step 6: Save report to DB ---
  const { data: savedReport, error: saveError } = await supabase
    .from('model_monitor_reports')
    .insert({
      report_date: reportDate,
      report_markdown: report,
      price_changes_detected: priceChanges.length > 0,
      new_models_detected: true, // We always track new model awareness
      deprecations_detected: deprecations.some(d => d.severity === 'URGENT'),
      urgent_alerts: urgentAlerts,
      monthly_cost_summary: null,
    })
    .select()
    .single();

  if (saveError) {
    console.error('[MODEL MONITOR] Failed to save report:', saveError);
    return NextResponse.json({ error: 'Failed to save report', details: saveError.message }, { status: 500 });
  }

  console.log(`[MODEL MONITOR] Report saved: ${savedReport.id}. Urgent alerts: ${urgentAlerts.length}`);

  return NextResponse.json({
    success: true,
    reportId: savedReport.id,
    reportDate,
    urgentAlertCount: urgentAlerts.length,
    priceChanges: priceChanges.length,
    recommendations: recommendations.length,
    summary: urgentAlerts.length > 0
      ? `⚠️ ${urgentAlerts.length} urgent alert(s) require action.`
      : 'No urgent issues detected.',
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPricingUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: 'https://openai.com/api/pricing/',
    anthropic: 'https://docs.anthropic.com/en/docs/about-claude/models',
    google: 'https://ai.google.dev/pricing',
    microsoft: 'https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/',
  };
  return urls[provider] ?? '';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelCatalogEntry {
  provider: string;
  model: string;
  inputCost: number | null;
  outputCost: number | null;
  notes: string;
}

interface PlatformModel {
  useCase: string;
  provider: string;
  model: string;
  inputCost: number | null;
  outputCost: number | null;
}

interface DeprecationNotice {
  provider: string;
  model: string;
  deprecationDate: string | null;
  replacement: string;
  note: string;
  severity: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Recommendation {
  severity: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  useCase: string;
  recommendation: string;
  reasoning: string;
}

interface PriceChange {
  model: string;
  oldInput: number | null;
  oldOutput: number | null;
  newInput: number | null;
  newOutput: number | null;
  impact: string;
}

interface ReportParams {
  config: PlatformModel[];
  deprecations: DeprecationNotice[];
  recommendations: Recommendation[];
  monthlyCost: { total: number } | null;
  priceChanges: PriceChange[];
  reportDate: string;
}
