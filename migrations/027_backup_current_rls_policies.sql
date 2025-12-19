-- Backup Current RLS Policies Before Migration 027
-- Run this BEFORE running 027_enable_rls_on_missing_tables.sql
-- This creates a backup of your current RLS policy state

-- ============================================================================
-- BACKUP CURRENT RLS POLICIES
-- ============================================================================
-- This query exports all current RLS policies for the tables we're modifying
-- Copy the results and save to a file for reference

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'text_relationships',
    'import_history',
    'agent_logs',
    'text_chunks',
    'convergence_queries',
    'convergence_responses',
    'correspondences',
    'correspondence_relationships'
)
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- BACKUP CURRENT RLS STATUS
-- ============================================================================
-- Check which tables currently have RLS enabled

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'text_relationships',
    'import_history',
    'agent_logs',
    'text_chunks',
    'convergence_queries',
    'convergence_responses',
    'correspondences',
    'correspondence_relationships'
)
ORDER BY tablename;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. Run this query in Supabase SQL Editor
-- 2. Copy the results (right-click → Copy or Ctrl+C)
-- 3. Save to a text file: backups/pre-migration-027-rls-backup-YYYY-MM-DD.txt
-- 4. This gives you a record of the current state before migration
-- 
-- Note: This is a lightweight backup of RLS policies only.
-- For a full database backup, use pg_dump or upgrade to Pro tier.
