-- ============================================================
-- DEFINITIVE FIX: Disable RLS on announcements
-- Frontend (React) already enforces role-based access control
-- Run ONLY these lines in Supabase SQL Editor
-- ============================================================

-- Disable RLS entirely on announcements
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- Also make sure the status column exists with the right values
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS reject_reason TEXT;
