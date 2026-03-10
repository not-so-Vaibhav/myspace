-- ============================================================
-- COPY AND RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================================

-- Step 1: Fix the RLS policy (add missing uploaded_by check)
DROP POLICY IF EXISTS "Instructors can insert resources for own courses" ON public.course_resources;

CREATE POLICY "Instructors can insert resources for own courses"
  ON public.course_resources
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_resources.course_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- Step 2: Fix ALL YOUR courses to have you as instructor
UPDATE public.courses
SET instructor_id = auth.uid()
WHERE instructor_id IS NULL;

-- Step 3: Verify everything is fixed
SELECT 
  id, 
  title, 
  instructor_id,
  (instructor_id = auth.uid()) as i_am_instructor
FROM public.courses
WHERE instructor_id = auth.uid()
ORDER BY id;

-- If you see your courses listed above with i_am_instructor = TRUE, you're done!
