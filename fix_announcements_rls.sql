-- ========================================================
-- FIX: Announcements RLS Policies
-- Run this in Supabase SQL Editor → SQL Editor → New Query
-- ========================================================
-- This fixes the "new row violates row-level security" error
-- when faculty, HOD, or dean try to create announcements.
-- ========================================================

-- 1. Allow faculty/HOD/Dean to INSERT announcements (as pending)
DROP POLICY IF EXISTS "Faculty can insert announcements" ON announcements;
CREATE POLICY "Faculty can insert announcements"
    ON announcements FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('faculty', 'instructor', 'hod', 'dean')
        )
    );

-- 2. Allow admins to INSERT announcements (as approved)
DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
CREATE POLICY "Admins can insert announcements"
    ON announcements FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 3. Allow admin/dean/hod to UPDATE announcements (approve/reject)
DROP POLICY IF EXISTS "Admin and service can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dean', 'hod')
        )
        OR created_by = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'dean', 'hod')
        )
        OR created_by = auth.uid()
    );

-- 4. Allow faculty to view their own pending announcements
DROP POLICY IF EXISTS "Faculty can view own announcements" ON announcements;
CREATE POLICY "Faculty can view own announcements"
    ON announcements FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
    );

-- 5. Approved announcements visible to students
DROP POLICY IF EXISTS "Students can view announcements" ON announcements;
CREATE POLICY "Students can view announcements"
    ON announcements FOR SELECT
    TO authenticated
    USING (
        status = 'approved'
        AND target_audience IN ('student', 'both')
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'student'
        )
    );

-- 6. Approved announcements visible to faculty
DROP POLICY IF EXISTS "Faculty can view announcements" ON announcements;
DROP POLICY IF EXISTS "Faculty can view approved announcements" ON announcements;
CREATE POLICY "Faculty can view approved announcements"
    ON announcements FOR SELECT
    TO authenticated
    USING (
        status = 'approved'
        AND target_audience IN ('faculty', 'both')
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('faculty', 'instructor', 'hod', 'dean')
        )
    );

-- ========================================================
-- OPTIONAL: Add Phase 9 extended columns
-- (only needed for priority, category, is_pinned etc.)
-- ========================================================
ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS priority       TEXT NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS category       TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    ADD COLUMN IF NOT EXISTS target_scope   TEXT NOT NULL DEFAULT 'UNIVERSITY',
    ADD COLUMN IF NOT EXISTS is_pinned      BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_deleted     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
