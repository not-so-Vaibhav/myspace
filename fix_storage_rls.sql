-- ============================================================
-- FIX STORAGE PERMISSIONS
-- ============================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on objects (it should be on by default, but just in case)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Instructors can upload course resources" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course resources" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course resources" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course resources" ON storage.objects;

-- 4. CREATE UPLOAD POLICY (The Critical Fix)
-- Allows authenticated users to upload to 'course-resources' bucket
CREATE POLICY "Instructors can upload course resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-resources' 
  AND auth.role() = 'authenticated'
);

-- 5. CREATE VIEW POLICY
-- Allows everyone to view files in this bucket
CREATE POLICY "Anyone can view course resources"
ON storage.objects FOR SELECT
USING ( bucket_id = 'course-resources' );

-- 6. CREATE UPDATE/DELETE POLICY
-- Allows users to update/delete their own files
CREATE POLICY "Instructors can update course resources"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'course-resources' AND owner = auth.uid() );

CREATE POLICY "Instructors can delete course resources"
ON storage.objects FOR DELETE
USING ( bucket_id = 'course-resources' AND owner = auth.uid() );

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
