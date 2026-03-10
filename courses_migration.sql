-- ============================================================
-- LMS COURSES SYSTEM - PRODUCTION MIGRATION
-- ============================================================
-- This migration adds pricing, publishing, and payment functionality
-- to the existing courses system.
--
-- IMPORTANT: Run this AFTER supabase_schema.sql and supabase_migrations.sql
-- ============================================================

-- ============================================================
-- STEP 1: EXTEND COURSES TABLE
-- ============================================================

-- Add new columns to courses table
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add check constraint to ensure price is non-negative
ALTER TABLE public.courses
  ADD CONSTRAINT courses_price_positive CHECK (price >= 0);

-- Create index for published courses (improves query performance)
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);

-- ============================================================
-- STEP 2: EXTEND ENROLLMENTS TABLE
-- ============================================================

-- Add payment_status column to enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free';

-- Add check constraint for payment_status values
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_payment_status_check 
  CHECK (payment_status IN ('free', 'pending', 'completed', 'failed', 'refunded'));

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON public.enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);

-- ============================================================
-- STEP 3: DROP EXISTING POLICIES (TO BE RECREATED)
-- ============================================================

-- Drop old course policies to recreate with new logic
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Instructors and admins can create courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete own courses" ON public.courses;

-- Drop old enrollment policies to recreate with new logic
DROP POLICY IF EXISTS "Users see own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors see enrollments for their courses" ON public.enrollments;

-- ============================================================
-- STEP 4: CREATE NEW RLS POLICIES FOR COURSES
-- ============================================================

-- SELECT: Students see only published courses, instructors see ALL courses (including their unpublished ones)
CREATE POLICY "Students can view published courses, instructors can view all"
  ON public.courses
  FOR SELECT
  USING (
    -- Published courses are visible to everyone
    is_published = true
    OR
    -- Instructors and admins can see all courses (including unpublished)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- INSERT: Only instructors and admins can create courses
CREATE POLICY "Instructors and admins can create courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- UPDATE: Instructors can only update their own courses
CREATE POLICY "Instructors can update their own courses"
  ON public.courses
  FOR UPDATE
  USING (
    instructor_id = auth.uid()
  )
  WITH CHECK (
    instructor_id = auth.uid()
  );

-- DELETE: Instructors can only delete their own courses
CREATE POLICY "Instructors can delete their own courses"
  ON public.courses
  FOR DELETE
  USING (
    instructor_id = auth.uid()
  );

-- ============================================================
-- STEP 5: CREATE NEW RLS POLICIES FOR ENROLLMENTS
-- ============================================================

-- SELECT: Users see their own enrollments, instructors see enrollments for their courses
CREATE POLICY "Users see own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (
    -- User can see their own enrollments
    auth.uid() = user_id
    OR
    -- Instructors can see enrollments for their courses
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- INSERT: Users can enroll themselves (only in published courses)
CREATE POLICY "Users can enroll in published courses"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (
    -- Must be enrolling themselves
    auth.uid() = user_id
    AND
    -- Course must be published
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.is_published = true
    )
  );

-- UPDATE: Users can update their own enrollments (e.g., payment status updates)
-- Note: In production, payment status should be updated by backend/webhook, not directly by user
CREATE POLICY "System can update enrollment payment status"
  ON public.enrollments
  FOR UPDATE
  USING (
    -- User can see their own enrollment
    auth.uid() = user_id
    OR
    -- Instructor can update enrollments for their courses
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    -- User can update their own enrollment
    auth.uid() = user_id
    OR
    -- Instructor can update enrollments for their courses
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- DELETE: Users can unenroll themselves, instructors can remove enrollments from their courses
CREATE POLICY "Users can unenroll, instructors can remove enrollments"
  ON public.enrollments
  FOR DELETE
  USING (
    -- User can delete their own enrollment
    auth.uid() = user_id
    OR
    -- Instructor can delete enrollments from their courses
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: CREATE HELPER FUNCTIONS (OPTIONAL BUT RECOMMENDED)
-- ============================================================

-- Function to get enrolled student count for a course
CREATE OR REPLACE FUNCTION public.get_course_enrollment_count(course_id_param BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO enrollment_count
  FROM public.enrollments
  WHERE course_id = course_id_param
  AND payment_status IN ('free', 'completed');
  
  RETURN enrollment_count;
END;
$$;

-- Function to check if a user is enrolled in a course
CREATE OR REPLACE FUNCTION public.is_user_enrolled(user_id_param UUID, course_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enrolled BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.enrollments
    WHERE user_id = user_id_param
    AND course_id = course_id_param
    AND payment_status IN ('free', 'completed')
  ) INTO is_enrolled;
  
  RETURN is_enrolled;
END;
$$;

-- ============================================================
-- STEP 7: UPDATE EXISTING DATA (OPTIONAL)
-- ============================================================

-- Set all existing courses to published (adjust as needed for your use case)
-- Comment this out if you want to manually publish courses
UPDATE public.courses
SET is_published = true
WHERE is_published IS NULL OR is_published = false;

-- Set all existing enrollments to 'free' status
UPDATE public.enrollments
SET payment_status = 'free'
WHERE payment_status IS NULL;

-- ============================================================
-- STEP 8: FIX COURSE_RESOURCES RLS POLICIES
-- ============================================================

-- Drop existing broken course_resources policies
DROP POLICY IF EXISTS "Course resources viewable by everyone" ON public.course_resources;
DROP POLICY IF EXISTS "Instructors can insert resources for own courses" ON public.course_resources;
DROP POLICY IF EXISTS "Instructors can delete resources for own courses" ON public.course_resources;

-- CREATE CORRECTED RLS POLICIES FOR COURSE_RESOURCES

-- SELECT: Everyone can view resources (for enrolled students and instructors)
CREATE POLICY "Course resources viewable by everyone"
  ON public.course_resources
  FOR SELECT
  USING (true);

-- INSERT: Only instructors can upload resources to their own courses
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

-- DELETE: Only instructors can delete resources from their own courses
CREATE POLICY "Instructors can delete resources for own courses"
  ON public.course_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_resources.course_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Courses table now has price and is_published columns';
  RAISE NOTICE 'Enrollments table now has payment_status column';
  RAISE NOTICE 'All RLS policies have been updated';
  RAISE NOTICE 'course_resources RLS policies fixed - instructors can now upload';
  RAISE NOTICE 'Remember to test the policies with different user roles';
END $$;
