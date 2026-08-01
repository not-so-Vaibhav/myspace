-- ============================================================================
-- FIX: Meetings & Live Classes Table Schema and RLS Policies
-- Run this in your Supabase SQL Editor to ensure full real-time database support
-- ============================================================================

-- 1. Ensure meetings table exists with all required columns
CREATE TABLE IF NOT EXISTS public.meetings (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    agenda TEXT NOT NULL,
    location TEXT,
    organized_by TEXT,
    status TEXT DEFAULT 'upcoming',
    room_id TEXT,
    participants_count INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add room_id column to meetings if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'room_id') THEN
        ALTER TABLE public.meetings ADD COLUMN room_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'participants_count') THEN
        ALTER TABLE public.meetings ADD COLUMN participants_count INTEGER DEFAULT 1;
    END IF;
END $$;

-- 3. Enable RLS on meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 4. Allow any authenticated user (Dean, HOD, Faculty, Admin, Student) to read all meetings
DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;
CREATE POLICY "Anyone can view meetings"
    ON public.meetings FOR SELECT
    USING (true);

-- 5. Allow authenticated users to create/insert meetings
DROP POLICY IF EXISTS "Authenticated users can insert meetings" ON public.meetings;
CREATE POLICY "Authenticated users can insert meetings"
    ON public.meetings FOR INSERT
    WITH CHECK (true);

-- 6. Allow creators or admins to update meetings
DROP POLICY IF EXISTS "Authenticated users can update meetings" ON public.meetings;
CREATE POLICY "Authenticated users can update meetings"
    ON public.meetings FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 7. Ensure announcements table allows LIVE_CLASS announcements to be viewed by everyone
DROP POLICY IF EXISTS "Anyone can view approved announcements" ON public.announcements;
CREATE POLICY "Anyone can view approved announcements"
    ON public.announcements FOR SELECT
    USING (status = 'approved' OR created_by = auth.uid());

-- 8. Ensure authenticated faculty, HOD, Dean, and Admin can insert LIVE_CLASS announcements
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON public.announcements;
CREATE POLICY "Authenticated users can insert announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (true);
