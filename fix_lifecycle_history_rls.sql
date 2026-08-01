-- fix_lifecycle_history_rls.sql
-- Fixes Row Level Security policies on student_lifecycle_history table
-- to allow the backend (using anon key) to insert and update records.
--
-- Run this in your Supabase SQL Editor.

-- 1. Allow anyone authenticated OR the anon role to INSERT lifecycle history records
--    (The backend service uses the anon key, so we need anon access)

-- Drop any existing insert policy that might be too restrictive
DROP POLICY IF EXISTS "Allow authenticated insert on lifecycle history" ON public.student_lifecycle_history;
DROP POLICY IF EXISTS "Allow insert on lifecycle history" ON public.student_lifecycle_history;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.student_lifecycle_history;

-- Create a permissive INSERT policy allowing anon and authenticated roles
CREATE POLICY "Allow service insert on lifecycle history"
  ON public.student_lifecycle_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Also ensure SELECT is open for reading history
DROP POLICY IF EXISTS "Allow select on lifecycle history" ON public.student_lifecycle_history;
DROP POLICY IF EXISTS "Allow authenticated select on lifecycle history" ON public.student_lifecycle_history;

CREATE POLICY "Allow service select on lifecycle history"
  ON public.student_lifecycle_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Also fix profiles table UPDATE (lifecycle_status update might be blocked too)
DROP POLICY IF EXISTS "Allow service update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon update on profiles" ON public.profiles;

-- Allow backend to update lifecycle_status on profiles
CREATE POLICY "Allow anon update lifecycle_status on profiles"
  ON public.profiles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Verify RLS is enabled on both tables
ALTER TABLE public.student_lifecycle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Done! The backend can now insert lifecycle history and update profile status.
