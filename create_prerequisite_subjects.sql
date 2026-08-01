-- ==============================================================
-- MIGRATION: PREREQUISITE SUBJECTS MAPPING
-- ==============================================================
-- Enables complex academic rules where certain subjects must be 
-- cleared or attempted before enrolling in advanced subjects.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.prerequisite_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    prerequisite_subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent a subject from being its own prerequisite
    CONSTRAINT chk_no_self_prerequisite 
        CHECK (subject_id != prerequisite_subject_id),
        
    -- Prevent duplicate mappings
    CONSTRAINT uq_subject_prerequisite 
        UNIQUE (subject_id, prerequisite_subject_id)
);

-- ==============================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE public.prerequisite_subjects ENABLE ROW LEVEL SECURITY;

-- Allow public read access (necessary for students/faculty to view curriculum)
CREATE POLICY "Prerequisite subjects are viewable by everyone"
    ON public.prerequisite_subjects FOR SELECT
    USING (true);

-- ==============================================================
-- PERFORMANCE INDEXES
-- ==============================================================
-- Fast lookup for "what are the prerequisites for this subject?"
CREATE INDEX IF NOT EXISTS idx_prereq_subject ON public.prerequisite_subjects(subject_id);

-- Fast lookup for "what advanced subjects does this prerequisite unlock?"
CREATE INDEX IF NOT EXISTS idx_prereq_unlocks ON public.prerequisite_subjects(prerequisite_subject_id);

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
