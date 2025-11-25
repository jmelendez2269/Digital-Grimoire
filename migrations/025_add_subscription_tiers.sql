-- Migration 025: Update subscription_status to support multiple tiers
-- Adds student, scholar, and adept tiers

-- Drop existing check constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

-- Add new check constraint with all tier options
ALTER TABLE users 
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('free', 'student', 'scholar', 'adept', 'premium', 'active', NULL));

-- Update comment for documentation
COMMENT ON COLUMN users.subscription_status IS 'Subscription tier: free (5 queries, 25 pages), student ($5 - unlimited pages, 5 queries), scholar ($9.99 - 25-50 queries), adept ($15 - 50-100 queries). Legacy: premium/active treated as scholar.';

-- Success message
SELECT 'Subscription tiers updated successfully! Use: free, student, scholar, adept' as message;

