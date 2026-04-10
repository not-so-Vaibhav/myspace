CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('student', 'faculty', 'both')),
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT all
CREATE POLICY "Admins can select announcements" ON announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can INSERT
CREATE POLICY "Admins can insert announcements" ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can UPDATE
CREATE POLICY "Admins can update announcements" ON announcements FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can DELETE
CREATE POLICY "Admins can delete announcements" ON announcements FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Students can view 'student' and 'both' announcements
CREATE POLICY "Students can view announcements" ON announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  AND target_audience IN ('student', 'both')
);

-- Faculty can view 'faculty' and 'both' announcements
CREATE POLICY "Faculty can view announcements" ON announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('faculty', 'instructor', 'hod', 'dean')
  )
  AND target_audience IN ('faculty', 'both')
);

-- Storage bucket (run separately if needed)
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view announcement files" ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Admin can upload announcement files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcements' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Admin can delete announcement files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcements' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
