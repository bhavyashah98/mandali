-- ============================================================
-- Migration: Create notifications table
-- Created: 2026-06-13
-- Run via: supabase db push  (or paste into SQL Editor)
-- ============================================================

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id        UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL DEFAULT '',
    entity_id       UUID,               -- loosely references any related row (plan, memory, expense, game…)
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────
-- Fast lookup for a user's notification feed
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON public.notifications (user_id, created_at DESC);

-- Useful for unread-count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, is_read)
    WHERE is_read = false;

-- Group-scoped queries
CREATE INDEX IF NOT EXISTS idx_notifications_group_id
    ON public.notifications (group_id);

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Only the service role (backend) can insert notifications
CREATE POLICY "Service role inserts notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);          -- backend uses service key, no JWT check needed

-- Users can update (mark as read) only their own notifications
CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notifications (optional)
CREATE POLICY "Users delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);
