-- Add status column to announcements table for approval workflow
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- Update existing rows to be approved (admin-created ones)
UPDATE announcements SET status = 'approved' WHERE status IS NULL;

-- Drop old admin select policy and recreate to include pending ones
DROP POLICY IF EXISTS "Admins can select announcements" ON announcements;
CREATE POLICY "Admins can select announcements" ON announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Faculty can INSERT (as pending)
DROP POLICY IF EXISTS "Faculty can insert announcements" ON announcements;
CREATE POLICY "Faculty can insert announcements" ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('faculty', 'instructor', 'hod')
  )
  AND status = 'pending'
);

-- Faculty can view their own pending announcements
DROP POLICY IF EXISTS "Faculty can view own announcements" ON announcements;
CREATE POLICY "Faculty can view own announcements" ON announcements FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('faculty', 'instructor', 'hod')
  )
);

-- Students only see approved announcements targeted at them
DROP POLICY IF EXISTS "Students can view announcements" ON announcements;
CREATE POLICY "Students can view announcements" ON announcements FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND target_audience IN ('student', 'both')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
);

-- Faculty only see approved announcements targeted at them (plus their own)
DROP POLICY IF EXISTS "Faculty can view announcements" ON announcements;
CREATE POLICY "Faculty can view approved announcements" ON announcements FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND target_audience IN ('faculty', 'both')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('faculty', 'instructor', 'hod', 'dean')
  )
);
