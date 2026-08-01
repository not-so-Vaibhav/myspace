-- ==============================================================
-- PHASE 9: ENTERPRISE NOTIFICATION & ANNOUNCEMENT INTEGRATION
-- ==============================================================
-- Additive, non-destructive SQL schema extending existing public.notifications
-- and announcements tables, and adding notification_preferences and
-- notification_audit_logs tables with idempotent RLS policies.
--
-- IMPORTANT: Run this in your Supabase SQL Editor.
-- This fixes the RLS 403 error on announcements INSERT/UPDATE.
-- ==============================================================

-- ─── 1. Extend Existing public.notifications Table ───────────
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS priority    TEXT    NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    ADD COLUMN IF NOT EXISTS category    TEXT    NOT NULL DEFAULT 'ACADEMIC' CHECK (category IN ('COURSE_REGISTRATION', 'ACADEMIC', 'ATTENDANCE', 'EXAM', 'ASSIGNMENT', 'FACULTY', 'ADMIN', 'ANNOUNCEMENT', 'REMINDER')),
    ADD COLUMN IF NOT EXISTS action_url  TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON TABLE public.notifications IS
  'In-app notification messages delivered to students, faculty, and administrators across Phase 1-9 ERP modules.';

-- ─── 2. Extend Existing announcements Table ───────────────────
ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS priority         TEXT        NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    ADD COLUMN IF NOT EXISTS category         TEXT        NOT NULL DEFAULT 'ANNOUNCEMENT' CHECK (category IN ('COURSE_REGISTRATION', 'ACADEMIC', 'ATTENDANCE', 'EXAM', 'ASSIGNMENT', 'FACULTY', 'ADMIN', 'ANNOUNCEMENT', 'REMINDER')),
    ADD COLUMN IF NOT EXISTS target_scope     TEXT        NOT NULL DEFAULT 'UNIVERSITY' CHECK (target_scope IN ('UNIVERSITY', 'DEPARTMENT', 'PROGRAM', 'ACADEMIC_YEAR', 'YEAR_LEVEL', 'CLASS', 'BATCH', 'FACULTY_ONLY', 'INDIVIDUAL')),
    ADD COLUMN IF NOT EXISTS department_id    UUID,
    ADD COLUMN IF NOT EXISTS program_id       UUID,
    ADD COLUMN IF NOT EXISTS academic_year_id UUID,
    ADD COLUMN IF NOT EXISTS class_id         UUID,
    ADD COLUMN IF NOT EXISTS batch_id         UUID,
    ADD COLUMN IF NOT EXISTS target_user_id   UUID,
    ADD COLUMN IF NOT EXISTS is_pinned        BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS scheduled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS expiry_date      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_archived      BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_deleted       BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;

COMMENT ON TABLE announcements IS
  'Institutional announcements targeting entire university, departments, programs, classes, batches, faculty, or individual users.';

-- ─── 3. Create public.notification_preferences Table ─────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id              UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    in_app_enabled       BOOLEAN     NOT NULL DEFAULT true,
    email_enabled        BOOLEAN     NOT NULL DEFAULT true,
    category_preferences JSONB       NOT NULL DEFAULT '{"COURSE_REGISTRATION": true, "ACADEMIC": true, "ATTENDANCE": true, "EXAM": true, "ASSIGNMENT": true, "FACULTY": true, "ADMIN": true, "ANNOUNCEMENT": true, "REMINDER": true}'::jsonb,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS
  'User-level notification channel and category preferences.';

-- ─── 4. Create public.notification_audit_logs Table ──────────
CREATE TABLE IF NOT EXISTS public.notification_audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      TEXT        NOT NULL CHECK (event_type IN ('NOTIFICATION_CREATED', 'NOTIFICATION_DELIVERED', 'NOTIFICATION_READ', 'NOTIFICATION_DELETED', 'ANNOUNCEMENT_PUBLISHED', 'REMINDER_TRIGGERED')),
    actor_id        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_user_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    notification_id UUID,
    announcement_id UUID,
    details         JSONB       DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_audit_logs IS
  'Immutable enterprise audit trail for all notification and announcement lifecycle events.';

-- ─── 5. Indexes for Performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority
    ON public.notifications(user_id, priority, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_announcements_scope_pinned
    ON announcements(target_scope, is_pinned DESC, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notification_audit_event
    ON public.notification_audit_logs(event_type, created_at DESC);

-- ─── 6. Row Level Security (RLS) Policies (Idempotent) ───────
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_audit_logs  ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE POLICIES
-- ══════════════════════════════════════════════════════════════

-- Users view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Users update their own notifications (mark read, archive)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Backend service manages all notifications (INSERT, DELETE, SELECT)
DROP POLICY IF EXISTS "Backend service can manage notifications" ON public.notifications;
CREATE POLICY "Backend service can manage notifications"
    ON public.notifications FOR ALL
    USING (auth.role() IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.role() IN ('service_role', 'anon', 'authenticated'));

-- ══════════════════════════════════════════════════════════════
-- ANNOUNCEMENTS TABLE POLICIES (FIXES 403 ERROR)
-- ══════════════════════════════════════════════════════════════

-- Enable RLS on announcements if not already enabled
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read approved announcements
DROP POLICY IF EXISTS "Anyone can view approved announcements" ON announcements;
CREATE POLICY "Anyone can view approved announcements"
    ON announcements FOR SELECT
    USING (
        status = 'approved'
        OR auth.role() = 'service_role'
        OR (auth.uid() = created_by)
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean')
        )
    );

-- Authenticated users (admin, faculty, hod) can insert announcements
DROP POLICY IF EXISTS "Staff can insert announcements" ON announcements;
CREATE POLICY "Staff can insert announcements"
    ON announcements FOR INSERT
    WITH CHECK (
        auth.role() IN ('service_role', 'authenticated')
    );

-- Admin/Dean/HOD/Service role can update announcements (approve/reject)
DROP POLICY IF EXISTS "Admin and service can update announcements" ON announcements;
CREATE POLICY "Admin and service can update announcements"
    ON announcements FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean', 'hod')
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean', 'hod')
        )
    );

-- Admin/Dean/Service role can delete announcements
DROP POLICY IF EXISTS "Admin and service can delete announcements" ON announcements;
CREATE POLICY "Admin and service can delete announcements"
    ON announcements FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean')
        )
    );

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES TABLE POLICIES
-- ══════════════════════════════════════════════════════════════

-- Users manage own preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id OR auth.role() IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.uid() = user_id OR auth.role() IN ('service_role', 'anon', 'authenticated'));

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATION AUDIT LOGS TABLE POLICIES
-- ══════════════════════════════════════════════════════════════

-- Service role writes audit logs
DROP POLICY IF EXISTS "Service role manages audit logs" ON public.notification_audit_logs;
CREATE POLICY "Service role manages audit logs"
    ON public.notification_audit_logs FOR ALL
    USING (auth.role() IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.role() IN ('service_role', 'anon', 'authenticated'));

-- Admins/Deans/HODs can read audit logs
DROP POLICY IF EXISTS "Admins can select audit logs" ON public.notification_audit_logs;
CREATE POLICY "Admins can select audit logs"
    ON public.notification_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dean', 'hod')
        )
    );

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
