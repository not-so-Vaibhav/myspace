-- ============================================================
-- COMPREHENSIVE DEBUG: Check Everything
-- ============================================================

-- 1. Check if course 4 has instructor_id set correctly
SELECT 
  id, 
  title, 
  instructor_id,
  instructor_id IS NULL as missing_instructor,
  auth.uid() as my_auth_id,
  (instructor_id = auth.uid()) as ids_match
FROM public.courses
WHERE id = 4;

-- 2. Check the ACTUAL RLS policy that's active
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'course_resources' 
AND policyname LIKE '%insert%';

-- 3. Check your current user profile
SELECT 
  id,
  role,
  full_name,
  auth.uid() as auth_uid,
  (id = auth.uid()) as ids_match
FROM profiles 
WHERE id = auth.uid();

-- 4. TEST: Try to insert manually (this will show us the EXACT error)
-- Replace 'YOUR_UUID_HERE' with the auth_uid from query 3 above
INSERT INTO public.course_resources (
  course_id,
  file_name,
  storage_path,
  mime_type,
  uploaded_by
) VALUES (
  4,
  'test.pdf',
  '4/test/test.pdf',
  'application/pdf',
  auth.uid()
);

-- If the INSERT above works, the problem is in the React code
-- If it fails, the problem is in the RLS policy

-- Clean up test (only run if INSERT succeeded)
-- DELETE FROM public.course_resources WHERE file_name = 'test.pdf';
