-- ==============================================================================
-- FACULTY & HOD SUBJECT TAGS SYSTEM
-- ==============================================================================
-- Enables teaching personnel (Faculty, HOD, Instructors) to tag subjects they teach
-- and allows Administrators to search & filter faculty by subject expertise.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. ADD NON-BREAKING METADATA COLUMN ON PROFILES TABLE ─────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'subject_tags'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN subject_tags TEXT[] DEFAULT '{}'::TEXT[];
    END IF;
END $$;

-- ── 2. CREATE FACULTY SUBJECT TAGS RELATIONAL TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.faculty_subject_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_faculty_subject_tag UNIQUE (faculty_id, subject_id)
);

-- ── 3. PERFORMANCE INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faculty_subject_tags_faculty ON public.faculty_subject_tags(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subject_tags_subject ON public.faculty_subject_tags(subject_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subject_tags_created ON public.faculty_subject_tags(created_at DESC);

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.faculty_subject_tags ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view faculty subject tags
DROP POLICY IF EXISTS "Public and authenticated read for faculty subject tags" ON public.faculty_subject_tags;
CREATE POLICY "Public and authenticated read for faculty subject tags"
    ON public.faculty_subject_tags FOR SELECT
    USING ( true );

-- Policy 2: Faculty can add tags for themselves, or Admins/HODs/Deans can add
DROP POLICY IF EXISTS "Teaching staff and admins can insert subject tags" ON public.faculty_subject_tags;
CREATE POLICY "Teaching staff and admins can insert subject tags"
    ON public.faculty_subject_tags FOR INSERT
    WITH CHECK (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL -- allows backend service role or unauthenticated dev mode if needed
    );

-- Policy 3: Faculty can remove their own tags, or Admins/HODs/Deans can remove
DROP POLICY IF EXISTS "Teaching staff and admins can delete subject tags" ON public.faculty_subject_tags;
CREATE POLICY "Teaching staff and admins can delete subject tags"
    ON public.faculty_subject_tags FOR DELETE
    USING (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL
    );

-- ── 5. OPTIONAL REPORTING VIEW FOR ENTERPRISE ANALYTICS ───────────────────────
CREATE OR REPLACE VIEW public.view_faculty_subject_tags AS
SELECT 
    fst.id AS tag_id,
    p.id AS faculty_id,
    p.full_name AS faculty_name,
    p.email AS faculty_email,
    p.role AS faculty_role,
    p.department AS faculty_department,
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.credits AS subject_credits,
    s.type AS subject_type,
    fst.created_at AS tagged_at
FROM public.faculty_subject_tags fst
JOIN public.profiles p ON fst.faculty_id = p.id
JOIN public.subjects s ON fst.subject_id = s.id;

-- ── 6. SEED SAMPLE TAGS (FOR TESTING & IMMEDIATE VERIFICATION) ────────────────
DO $$
DECLARE
    fac_rec RECORD;
    sub_rec RECORD;
BEGIN
    -- For any existing faculty/HOD, link the first 2 available subjects if not already linked
    FOR fac_rec IN (SELECT id FROM public.profiles WHERE role IN ('faculty', 'hod', 'instructor', 'teacher') LIMIT 5) LOOP
        FOR sub_rec IN (SELECT id FROM public.subjects LIMIT 2) LOOP
            INSERT INTO public.faculty_subject_tags (faculty_id, subject_id)
            VALUES (fac_rec.id, sub_rec.id)
            ON CONFLICT (faculty_id, subject_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
