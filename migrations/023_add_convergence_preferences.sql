-- Migration 023: Add Convergence Machine User Preferences
-- Stores user's default lens weights and response length preferences

-- Add convergence_preferences JSONB column to users table for default Convergence Machine settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS convergence_preferences JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB column
CREATE INDEX IF NOT EXISTS idx_users_convergence_preferences 
ON users USING GIN (convergence_preferences);

-- Add comment for documentation
COMMENT ON COLUMN users.convergence_preferences IS 'User default preferences for Convergence Machine (lensWeights, responseLength)';

-- Success message
SELECT 'Convergence Machine preferences column added successfully!' as message;

