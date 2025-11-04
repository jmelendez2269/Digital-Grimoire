-- Helper script: Set your account to premium for testing
-- Run this in Supabase SQL Editor after updating with your email

-- Option 1: Set by email (replace with your email)
UPDATE users 
SET subscription_status = 'premium' 
WHERE email = 'your-email@example.com';

-- Option 2: Set all admins to premium (convenient for testing)
UPDATE users 
SET subscription_status = 'premium' 
WHERE role = 'admin';

-- Verify the update
SELECT id, email, role, subscription_status 
FROM users 
WHERE subscription_status = 'premium' OR role = 'admin';

-- Note: To test free tier limits, set subscription_status back to 'free'

