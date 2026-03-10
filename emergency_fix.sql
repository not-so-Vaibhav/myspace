-- ============================================================
-- EMERGENCY FIX: Set instructor_id for all your courses
-- ============================================================
-- Run this IMMEDIATELY in Supabase SQL Editor
-- ============================================================

-- Step 1: Fix ALL courses you created to have your ID as instructor
UPDATE public.courses
SET instructor_id = auth.uid()
WHERE instructor_id IS NULL;

-- Step 2: Verify your courses now have instructor_id
SELECT 
  id, 
  title, 
  instructor_id,
  (instructor_id = auth.uid()) as i_am_instructor,
  (instructor_id IS NULL) as missing_instructor
FROM courses
WHERE instructor_id = auth.uid() OR instructor_id IS NULL
ORDER BY id;

-- ============================================================
-- If this shows instructor_id is still NULL, run this:
-- ============================================================

-- Check your profile to get your UUID
SELECT id, role, full_name FROM profiles WHERE id = auth.uid();

-- Then manually update (replace YOUR_UUID_HERE with the UUID from above)
-- UPDATE public.courses
-- SET instructor_id = 'YOUR_UUID_HERE'
-- WHERE id IN (1, 2);  -- Add all your course IDs here

-- ============================================================
-- After running this, try uploading a file again
-- ============================================================
