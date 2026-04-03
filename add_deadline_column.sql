-- Run this in Supabase SQL Editor if course_materials table already exists
-- to add the deadline column without re-creating the table

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
