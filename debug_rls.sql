-- ============================================================
-- DEBUG: Check Current RLS Policies on course_resources
-- ============================================================
-- Run this in Supabase SQL Editor to see what policies exist
-- ============================================================

-- 1. Check all policies on course_resources table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'course_resources'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'course_resources';

-- 3. Test if you are an instructor (should return TRUE)
SELECT 
  id,
  role,
  auth.uid() as my_auth_uid,
  (id = auth.uid()) as ids_match
FROM profiles 
WHERE id = auth.uid();

-- 4. Check if your course exists and you own it
-- Replace 'YOUR_COURSE_ID' with the actual course ID (the number in URL)
SELECT 
  id,
  title,
  instructor_id,
  (instructor_id = auth.uid()) as i_am_instructor
FROM courses 
WHERE id = 1; -- CHANGE THIS TO YOUR COURSE ID

-- ============================================================
-- After running these queries, share the results
-- ============================================================
