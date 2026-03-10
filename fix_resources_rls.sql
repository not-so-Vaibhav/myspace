-- ============================================================
-- CRITICAL FIX: Course Resources RLS Policy
-- ============================================================
-- Run this in Supabase SQL Editor to fix the upload error
-- ============================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Instructors can insert resources for own courses" ON public.course_resources;

-- Create the CORRECT policy with BOTH checks
CREATE POLICY "Instructors can insert resources for own courses"
  ON public.course_resources
  FOR INSERT
  WITH CHECK (
    -- CRITICAL: Must check BOTH conditions
    uploaded_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_resources.course_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'course_resources' 
AND policyname = 'Instructors can insert resources for own courses';
