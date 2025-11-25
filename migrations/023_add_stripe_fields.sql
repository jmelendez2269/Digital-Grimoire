-- Migration 023: Add Stripe integration fields to users table
-- Enables Stripe customer and subscription tracking

-- Add Stripe customer ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe subscription ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add subscription dates
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Add indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- Add comments for documentation
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';
COMMENT ON COLUMN users.subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN users.subscription_end_date IS 'When the current subscription period ends';

-- Success message
SELECT 'Stripe fields added successfully!' as message;

