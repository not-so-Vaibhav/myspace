-- ==============================================================
-- MIGRATION: STUDENT LIFECYCLE ENGINE
-- Add lifecycle_status to profiles + create student_lifecycle_history
-- ==============================================================

-- ─── 1. Add lifecycle_status to public.profiles ────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'lifecycle_status'
    ) THEN
        ALTER TABLE public.profiles
            ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE'
            CONSTRAINT chk_lifecycle_status CHECK (
                lifecycle_status IN (
                    'APPLIED',
                    'ADMITTED',
                    'REGISTERED',
                    'COURSE_REGISTERED',
                    'ACTIVE',
                    'EXAM_ELIGIBLE',
                    'RESULT_PUBLISHED',
                    'PROMOTED',
                    'ATKT',
                    'REPEAT',
                    'DETAINED',
                    'SUSPENDED',
                    'DROP_OUT',
                    'ON_LEAVE',
                    'GRADUATED'
                )
            );
        RAISE NOTICE 'Added lifecycle_status column to public.profiles';
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.lifecycle_status IS
  'Current state in the student lifecycle state machine (e.g. APPLIED, ACTIVE, PROMOTED, GRADUATED).';

-- ─── 2. Create student_lifecycle_history (Audit Trail) ─────────
CREATE TABLE IF NOT EXISTS public.student_lifecycle_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_state      TEXT,
    to_state        TEXT        NOT NULL,
    transition_type TEXT        NOT NULL CHECK (transition_type IN ('AUTOMATIC', 'MANUAL', 'ADMIN_OVERRIDE')),
    reason          TEXT,
    metadata        JSONB       DEFAULT '{}'::jsonb,
    changed_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_lifecycle_history IS
  'Immutable audit log of all student lifecycle state transitions.';

-- ─── 3. Indexes for fast history & status queries ──────────────
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle_status
    ON public.profiles(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_lifecycle_history_student
    ON public.student_lifecycle_history(student_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_history_type
    ON public.student_lifecycle_history(transition_type);

-- ─── 4. Row Level Security ──────────────────────────────────────
ALTER TABLE public.student_lifecycle_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own history
CREATE POLICY "Students can view their own lifecycle history"
    ON public.student_lifecycle_history FOR SELECT
    USING (auth.uid() = student_id);

-- Staff/Admins/HODs/Deans can view all history
CREATE POLICY "Staff and Admins can view all lifecycle history"
    ON public.student_lifecycle_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dean', 'hod', 'faculty', 'instructor', 'non_teaching')
        )
    );

-- Backend service role can insert and manage history
CREATE POLICY "Backend service can manage lifecycle history"
    ON public.student_lifecycle_history FOR ALL
    USING (auth.role() = 'service_role');

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
