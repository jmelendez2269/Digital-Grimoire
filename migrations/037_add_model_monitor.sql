-- Migration 037: AI Model Monitor tables
-- Tracks pricing history, monitor reports, and platform model config

CREATE TABLE IF NOT EXISTS model_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_cost_per_1m NUMERIC,
  output_cost_per_1m NUMERIC,
  cost_unit TEXT DEFAULT 'tokens',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_pricing_history_provider_model
  ON model_pricing_history (provider, model_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS model_monitor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  report_markdown TEXT NOT NULL,
  price_changes_detected BOOLEAN DEFAULT false,
  new_models_detected BOOLEAN DEFAULT false,
  deprecations_detected BOOLEAN DEFAULT false,
  urgent_alerts JSONB DEFAULT '[]',
  monthly_cost_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_monitor_reports_date
  ON model_monitor_reports (report_date DESC);

CREATE TABLE IF NOT EXISTS platform_model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_cost_per_1m NUMERIC,
  output_cost_per_1m NUMERIC,
  max_tokens_default INTEGER,
  notes TEXT,
  last_reviewed TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with current model inventory
INSERT INTO platform_model_config (use_case, provider, model_name, input_cost_per_1m, output_cost_per_1m, notes) VALUES
  ('lens_scientific',       'openai',     'gpt-4o-mini',              0.15,  0.60,  'Cheaper alternatives preferred'),
  ('lens_psychological',    'anthropic',  'claude-3-5-sonnet-latest', 3.00,  15.00, 'Monitor new Claude releases'),
  ('lens_philosophical',    'anthropic',  'claude-3-5-sonnet-latest', 3.00,  15.00, 'Monitor price changes'),
  ('lens_religious',        'google',     'gemini-1.5-pro',           1.25,  5.00,  'Monitor new Gemini releases'),
  ('lens_historical',       'google',     'gemini-1.5-pro',           1.25,  5.00,  'Monitor price changes'),
  ('lens_symbolic',         'anthropic',  'claude-3-5-sonnet-latest', 3.00,  15.00, 'Monitor new releases'),
  ('lens_mathematical',     'openai',     'gpt-4o-mini',              0.15,  0.60,  'Cheaper alternatives preferred'),
  ('synthesis_merge',       'openai',     'gpt-4o',                   2.50,  10.00, 'Monitor newer models and price drops'),
  ('journal_ai',            'openai',     'gpt-4o-mini',              0.15,  0.60,  'Planned; monitor cheaper alternatives'),
  ('embeddings',            'openai',     'text-embedding-3-small',   0.02,  NULL,  'Monitor open-source options'),
  ('related_terms',         'openai',     'gpt-4o',                   2.50,  10.00, 'Could downgrade to cheaper model'),
  ('text_to_speech',        'microsoft',  'azure-neural-tts',         NULL,  NULL,  'Monitor alternative TTS providers; $16/1M chars'),
  ('deck_forge_image',      'tbd',        'tbd',                      NULL,  NULL,  'Monitor latest image gen models')
ON CONFLICT (use_case) DO NOTHING;

-- Auto-update updated_at on platform_model_config
CREATE OR REPLACE FUNCTION update_platform_model_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_model_config_updated_at ON platform_model_config;
CREATE TRIGGER trg_platform_model_config_updated_at
  BEFORE UPDATE ON platform_model_config
  FOR EACH ROW EXECUTE FUNCTION update_platform_model_config_updated_at();

-- RLS: admin only
ALTER TABLE model_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_monitor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_model_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_pricing_history" ON model_pricing_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_only_monitor_reports" ON model_monitor_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_only_model_config" ON platform_model_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
