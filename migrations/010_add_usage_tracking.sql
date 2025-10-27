-- API Usage Tracking Tables
-- Run this in your Supabase SQL Editor

-- Table to track all API calls and their costs
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- API Information
    service TEXT NOT NULL CHECK (service IN ('azure_ocr', 'openai_metadata', 'r2_storage', 'r2_bandwidth', 'other')),
    endpoint TEXT, -- Specific endpoint or operation
    operation TEXT, -- e.g., 'read_document', 'extract_metadata', 'upload', 'download'
    
    -- Usage Details
    units_used NUMERIC DEFAULT 0, -- pages for OCR, tokens for AI, bytes for storage
    unit_type TEXT, -- 'pages', 'tokens', 'bytes', 'requests'
    
    -- Cost Tracking
    estimated_cost NUMERIC(10, 6) DEFAULT 0, -- Cost in USD
    
    -- Request Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_id UUID REFERENCES texts(id) ON DELETE SET NULL,
    
    -- Request Metadata
    request_metadata JSONB DEFAULT '{}', -- Additional context (file size, response time, etc.)
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for daily usage summaries (for faster dashboard queries)
CREATE TABLE daily_usage_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    service TEXT NOT NULL,
    
    -- Aggregated Metrics
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    total_units NUMERIC DEFAULT 0,
    unit_type TEXT,
    total_cost NUMERIC(10, 2) DEFAULT 0,
    
    -- User Metrics
    unique_users INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, service)
);

-- Table for storage usage snapshots
CREATE TABLE storage_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Storage Metrics
    total_files INT DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- By File Type
    pdf_count INT DEFAULT 0,
    pdf_size_bytes BIGINT DEFAULT 0,
    image_count INT DEFAULT 0,
    image_size_bytes BIGINT DEFAULT 0,
    document_count INT DEFAULT 0,
    document_size_bytes BIGINT DEFAULT 0,
    
    -- R2 Specific
    bandwidth_bytes BIGINT DEFAULT 0, -- Bandwidth used since last snapshot
    
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user activity tracking
CREATE TABLE user_activity_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Activity Metrics
    documents_uploaded INT DEFAULT 0,
    documents_viewed INT DEFAULT 0,
    searches_performed INT DEFAULT 0,
    annotations_created INT DEFAULT 0,
    bookmarks_created INT DEFAULT 0,
    
    -- API Usage
    ocr_pages_processed INT DEFAULT 0,
    ai_tokens_used INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Table for cost thresholds and alerts
CREATE TABLE cost_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    alert_type TEXT NOT NULL CHECK (alert_type IN ('daily', 'weekly', 'monthly')),
    threshold_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) DEFAULT 0,
    
    threshold_exceeded BOOLEAN DEFAULT false,
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_usage_service ON api_usage(service);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_service_date ON api_usage(service, created_at);

CREATE INDEX idx_daily_summary_date ON daily_usage_summary(date DESC);
CREATE INDEX idx_daily_summary_service ON daily_usage_summary(service);

CREATE INDEX idx_user_activity_user_date ON user_activity_summary(user_id, date DESC);
CREATE INDEX idx_user_activity_date ON user_activity_summary(date DESC);

CREATE INDEX idx_storage_usage_date ON storage_usage(snapshot_date DESC);

-- Function to update daily usage summary
CREATE OR REPLACE FUNCTION update_daily_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_usage_summary (
        date,
        service,
        total_requests,
        successful_requests,
        failed_requests,
        total_units,
        unit_type,
        total_cost,
        unique_users
    )
    VALUES (
        CURRENT_DATE,
        NEW.service,
        1,
        CASE WHEN NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NEW.success THEN 0 ELSE 1 END,
        NEW.units_used,
        NEW.unit_type,
        NEW.estimated_cost,
        CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT (date, service) DO UPDATE SET
        total_requests = daily_usage_summary.total_requests + 1,
        successful_requests = daily_usage_summary.successful_requests + CASE WHEN NEW.success THEN 1 ELSE 0 END,
        failed_requests = daily_usage_summary.failed_requests + CASE WHEN NEW.success THEN 0 ELSE 1 END,
        total_units = daily_usage_summary.total_units + NEW.units_used,
        total_cost = daily_usage_summary.total_cost + NEW.estimated_cost,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update daily summary
CREATE TRIGGER trigger_update_daily_usage_summary
    AFTER INSERT ON api_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_usage_summary();

-- Function to update user activity summary
CREATE OR REPLACE FUNCTION update_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_count INT DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_summary (
        user_id,
        date,
        documents_uploaded,
        documents_viewed,
        searches_performed,
        annotations_created,
        bookmarks_created
    )
    VALUES (
        p_user_id,
        CURRENT_DATE,
        CASE WHEN p_activity_type = 'upload' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'view' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'search' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'annotation' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'bookmark' THEN p_count ELSE 0 END
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        documents_uploaded = user_activity_summary.documents_uploaded + CASE WHEN p_activity_type = 'upload' THEN p_count ELSE 0 END,
        documents_viewed = user_activity_summary.documents_viewed + CASE WHEN p_activity_type = 'view' THEN p_count ELSE 0 END,
        searches_performed = user_activity_summary.searches_performed + CASE WHEN p_activity_type = 'search' THEN p_count ELSE 0 END,
        annotations_created = user_activity_summary.annotations_created + CASE WHEN p_activity_type = 'annotation' THEN p_count ELSE 0 END,
        bookmarks_created = user_activity_summary.bookmarks_created + CASE WHEN p_activity_type = 'bookmark' THEN p_count ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (only admins can view usage data)
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access to usage tables
CREATE POLICY "Admins can view api_usage" ON api_usage FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can insert api_usage" ON api_usage FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view daily_usage_summary" ON daily_usage_summary FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can view storage_usage" ON storage_usage FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can view user_activity_summary" ON user_activity_summary FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own activity" ON user_activity_summary FOR SELECT USING (
    auth.uid() = user_id
);

CREATE POLICY "Admins can view cost_alerts" ON cost_alerts FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default cost alert thresholds
INSERT INTO cost_alerts (alert_type, threshold_amount) VALUES
    ('daily', 50.00),
    ('weekly', 300.00),
    ('monthly', 1000.00);

-- Success message
SELECT 'API Usage Tracking tables created successfully! ✅' as message;

