-- Migration 030: Fix confidence constraint on texts table
-- This ensures the confidence constraint allows NULL values and matches the schema definition
-- Fixes: "new row for relation "texts" violates check constraint "texts_confidence_check""
--
-- The issue: Preview database may have a stricter constraint (NOT NULL) or different definition
-- than production. This migration standardizes the constraint across all environments.

-- Step 1: Drop any existing confidence constraints (PostgreSQL may have auto-named them)
DO $$
DECLARE
    constraint_record record;
BEGIN
    -- Find all check constraints on the texts table that relate to confidence
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'texts'::regclass
        AND contype = 'c'
        AND (
            conname LIKE '%confidence%' 
            OR conname = 'texts_confidence_check'
        )
    LOOP
        EXECUTE format('ALTER TABLE texts DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped existing confidence constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Step 2: Remove NOT NULL constraint if it exists (allow NULL values as per schema)
ALTER TABLE texts 
ALTER COLUMN confidence DROP NOT NULL;

-- Step 3: Add the correct constraint that allows NULL values
-- This matches the schema definition: confidence TEXT CHECK (confidence IN (...))
-- The constraint explicitly allows NULL: "confidence IS NULL OR confidence IN (...)"
ALTER TABLE texts 
ADD CONSTRAINT texts_confidence_check 
CHECK (confidence IS NULL OR confidence IN ('established', 'interpretive', 'speculative', 'tradition'));

-- Step 4: Verify the constraint was created correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'texts'::regclass
        AND conname = 'texts_confidence_check'
    ) THEN
        RAISE NOTICE 'Confidence constraint created successfully: texts_confidence_check';
        RAISE NOTICE 'Constraint allows NULL values and these values: established, interpretive, speculative, tradition';
    ELSE
        RAISE EXCEPTION 'Failed to create confidence constraint';
    END IF;
END $$;

-- Success message
SELECT 'Confidence constraint fixed successfully! The constraint now allows NULL values and matches the schema definition.' as message;

