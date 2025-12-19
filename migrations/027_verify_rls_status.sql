-- Verification Script for Migration 027
-- Run this AFTER running 027_enable_rls_on_missing_tables.sql
-- This will verify that RLS is enabled on all required tables

-- ============================================================================
-- CHECK RLS STATUS ON ALL TABLES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
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
-- CHECK RLS POLICIES ON ALL TABLES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
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
-- SUMMARY: COUNT POLICIES PER TABLE
-- ============================================================================

SELECT 
    tablename,
    COUNT(*) as policy_count,
    COUNT(DISTINCT cmd) as operation_types,
    STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations
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
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- All 8 tables should show:
-- - rls_enabled = true
-- - At least one policy per table
-- - Policies for SELECT, INSERT, UPDATE, DELETE as appropriate
