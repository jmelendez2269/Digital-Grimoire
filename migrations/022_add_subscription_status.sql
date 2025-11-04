-- Migration 022: Add subscription_status column to users table
-- Enables premium tier checking for Convergence Machine

-- Add subscription_status column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT 
CHECK (subscription_status IN ('free', 'premium', 'active', NULL));

-- Set default to 'free'
ALTER TABLE users 
ALTER COLUMN subscription_status SET DEFAULT 'free';

-- Add comment for documentation
COMMENT ON COLUMN users.subscription_status IS 'Subscription tier: free (5 queries/month), premium/active (unlimited). Admins automatically get premium access.';

-- Add index for filtering premium users
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Success message
SELECT 'Subscription status column added successfully!' as message;

