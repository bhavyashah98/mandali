-- ============================================================
-- Migration: Add UGC safety columns and constraints
-- Created: 2026-06-30
-- Run via: supabase db push  (or paste into SQL Editor)
-- ============================================================

-- Alter public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Alter public.reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS content_owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Alter public.memories table
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Alter public.memory_comments table
ALTER TABLE public.memory_comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- RLS for blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users insert own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users delete own blocks" ON public.blocked_users;

CREATE POLICY "Users view own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users insert own blocks" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users delete own blocks" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Users view own reports" ON public.reports;

CREATE POLICY "Users insert own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
