-- Migration 024: Add 'convergence_query' service type to api_usage table
-- Enables cost tracking for Convergence Machine queries

-- Drop the existing CHECK constraint
ALTER TABLE api_usage 
DROP CONSTRAINT IF EXISTS api_usage_service_check;

-- Add new CHECK constraint with convergence_query included
ALTER TABLE api_usage 
ADD CONSTRAINT api_usage_service_check 
CHECK (service IN ('azure_ocr', 'openai_metadata', 'r2_storage', 'r2_bandwidth', 'convergence_query', 'notion', 'other'));

-- Success message
SELECT 'Convergence query service type added successfully!' as message;

