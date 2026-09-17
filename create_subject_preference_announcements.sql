-- ==============================================================================
-- ENTERPRISE FACULTY SUBJECT PREFERENCE & TIMETABLE PREPARATION SYSTEM
-- ==============================================================================
-- Enables Administrators to broadcast Subject Teaching Preference Calls (with deadlines)
-- to Faculty and HODs, allows teaching staff to select/submit preferred subjects,
-- and aggregates the responses for Admin Timetable & Schedule Allocation.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. EXTEND ANNOUNCEMENTS TABLE WITH PREFERENCE CALL METADATA ────────────────
DO $$
BEGIN
    -- Check if is_preference_call column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'is_preference_call'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN is_preference_call BOOLEAN DEFAULT false;
    END IF;

    -- Preference deadline (date & time when faculty responses close)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'preference_deadline'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN preference_deadline TIMESTAMPTZ;
    END IF;

    -- Target semester for teaching (e.g. 1, 2, 3, 4, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'target_semester'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN target_semester INT DEFAULT 1;
    END IF;

    -- Target Academic Year (e.g. '2026-2027')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'target_academic_year'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN target_academic_year VARCHAR(30) DEFAULT '2026-2027';
    END IF;

    -- Max number of subject choices faculty can submit (e.g. 3)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'max_preferences'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN max_preferences INT DEFAULT 3;
    END IF;

    -- Curriculum Pattern / Regulation (e.g. '2023 Pattern', '2027 Pattern')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'curriculum_pattern'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN curriculum_pattern VARCHAR(50) DEFAULT '2023 Pattern';
    END IF;

    -- Allowed subjects array (empty means all available subjects in department/institution)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements' 
        AND column_name = 'allowed_subject_ids'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN allowed_subject_ids UUID[] DEFAULT '{}'::UUID[];
    END IF;
END $$;

-- ── 2. CREATE FACULTY SUBJECT PREFERENCES TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faculty_subject_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    preference_rank INT NOT NULL DEFAULT 1 CHECK (preference_rank >= 1 AND preference_rank <= 10),
    preferred_type VARCHAR(30) DEFAULT 'Theory' CHECK (preferred_type IN ('Theory', 'Practical', 'Both', 'Audit')),
    preferred_hours_per_week INT DEFAULT 4 CHECK (preferred_hours_per_week >= 1 AND preferred_hours_per_week <= 40),
    preferred_day_slots TEXT DEFAULT 'Flexible',
    remarks TEXT,
    is_allocated BOOLEAN DEFAULT false,
    allocated_at TIMESTAMPTZ,
    allocated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Enforce uniqueness: A faculty cannot pick the same subject twice in one call, nor duplicate ranks
    CONSTRAINT uq_fsp_call_faculty_subject UNIQUE (announcement_id, faculty_id, subject_id),
    CONSTRAINT uq_fsp_call_faculty_rank UNIQUE (announcement_id, faculty_id, preference_rank)
);

-- Migration check for existing installations:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'faculty_subject_preferences' 
        AND column_name = 'is_allocated'
    ) THEN
        ALTER TABLE public.faculty_subject_preferences ADD COLUMN is_allocated BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'faculty_subject_preferences' 
        AND column_name = 'allocated_at'
    ) THEN
        ALTER TABLE public.faculty_subject_preferences ADD COLUMN allocated_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'faculty_subject_preferences' 
        AND column_name = 'allocated_by'
    ) THEN
        ALTER TABLE public.faculty_subject_preferences ADD COLUMN allocated_by UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- ── 3. PERFORMANCE INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fsp_announcement ON public.faculty_subject_preferences(announcement_id);
CREATE INDEX IF NOT EXISTS idx_fsp_faculty ON public.faculty_subject_preferences(faculty_id);
CREATE INDEX IF NOT EXISTS idx_fsp_subject ON public.faculty_subject_preferences(subject_id);
CREATE INDEX IF NOT EXISTS idx_fsp_allocated ON public.faculty_subject_preferences(announcement_id, is_allocated);
CREATE INDEX IF NOT EXISTS idx_fsp_rank ON public.faculty_subject_preferences(announcement_id, preference_rank);
CREATE INDEX IF NOT EXISTS idx_fsp_created ON public.faculty_subject_preferences(created_at DESC);

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────
ALTER TABLE public.faculty_subject_preferences ENABLE ROW LEVEL SECURITY;

-- Policy 1: Faculty can view their own preferences; Admins, HODs, Deans can view all
DROP POLICY IF EXISTS "View faculty subject preferences" ON public.faculty_subject_preferences;
CREATE POLICY "View faculty subject preferences"
    ON public.faculty_subject_preferences FOR SELECT
    USING (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL -- allows backend service role or unauthenticated dev mode if needed
    );

-- Policy 2: Faculty can insert their own subject choices (or Admin/HOD)
DROP POLICY IF EXISTS "Insert faculty subject preferences" ON public.faculty_subject_preferences;
CREATE POLICY "Insert faculty subject preferences"
    ON public.faculty_subject_preferences FOR INSERT
    WITH CHECK (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL
    );

-- Policy 3: Faculty can update their preferences before deadline (or Admin)
DROP POLICY IF EXISTS "Update faculty subject preferences" ON public.faculty_subject_preferences;
CREATE POLICY "Update faculty subject preferences"
    ON public.faculty_subject_preferences FOR UPDATE
    USING (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL
    );

-- Policy 4: Faculty can delete / reset their preferences before deadline (or Admin)
DROP POLICY IF EXISTS "Delete faculty subject preferences" ON public.faculty_subject_preferences;
CREATE POLICY "Delete faculty subject preferences"
    ON public.faculty_subject_preferences FOR DELETE
    USING (
        auth.uid() = faculty_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hod', 'dean')
        )
        OR auth.uid() IS NULL
    );

-- ── 5. ENTERPRISE VIEW FOR SCHEDULE ALLOCATION & TIMETABLE PREPARATION ────────
DROP VIEW IF EXISTS public.view_faculty_subject_preferences CASCADE;
CREATE OR REPLACE VIEW public.view_faculty_subject_preferences AS
SELECT 
    fsp.id AS preference_id,
    a.id AS announcement_id,
    a.title AS announcement_title,
    a.target_semester,
    a.target_academic_year,
    a.preference_deadline,
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
    fsp.preference_rank,
    fsp.preferred_type,
    fsp.preferred_hours_per_week,
    fsp.preferred_day_slots,
    fsp.remarks,
    fsp.is_allocated,
    fsp.allocated_at,
    fsp.allocated_by,
    fsp.created_at AS submitted_at,
    fsp.updated_at AS last_updated_at
FROM public.faculty_subject_preferences fsp
JOIN public.announcements a ON fsp.announcement_id = a.id
JOIN public.profiles p ON fsp.faculty_id = p.id
JOIN public.subjects s ON fsp.subject_id = s.id;

