-- ============================================================
-- SAFE STORAGE FIX: Use this script
-- ============================================================
-- The previous one failed because it tried to run ALTER TABLE
-- which requires superuser/owner permissions.
-- This script ONLY sets policies.
-- ============================================================

-- 1. Create the bucket (Safe even if it exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. CREATE POLICIES
-- We wrap in a transaction to ensure all or nothing

BEGIN;

-- Drop (if they exist) so we can recreate them
DROP POLICY IF EXISTS "Instructors can upload course resources" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course resources" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course resources" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course resources" ON storage.objects;

-- Create Upload Policy (Critical)
CREATE POLICY "Instructors can upload course resources"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'course-resources' 
    AND auth.role() = 'authenticated'
);

-- Create View Policy (Critical)
CREATE POLICY "Anyone can view course resources"
ON storage.objects FOR SELECT
USING ( bucket_id = 'course-resources' );

-- Create Update Policy
CREATE POLICY "Instructors can update course resources"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'course-resources' AND owner = auth.uid() );

-- Create Delete Policy
CREATE POLICY "Instructors can delete course resources"
ON storage.objects FOR DELETE
USING ( bucket_id = 'course-resources' AND owner = auth.uid() );

COMMIT;

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
