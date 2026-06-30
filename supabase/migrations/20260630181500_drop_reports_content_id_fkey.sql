-- ============================================================
-- Migration: Drop polymorphic reports.content_id foreign key constraint
-- Created: 2026-06-30
-- ============================================================

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_content_id_fkey;
