-- ==============================================================
-- ACADEMIC MAPPING SYSTEM: SUBJECT ALLOCATIONS
-- ==============================================================

CREATE TABLE public.subject_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate assignment: A specific subject in a specific batch can only have ONE allocation.
    -- This inherently enforces the "per batch + semester" rule because batch is unique to a semester.
    CONSTRAINT uq_subject_batch UNIQUE (subject_id, batch_id)
);

-- ==============================================================
-- INDEXING FOR SCALE (10,000+ allocations)
-- ==============================================================
-- Ensures O(log N) lookups instead of full table scans for dashboard queries
CREATE INDEX idx_suballoc_subject ON public.subject_allocations(subject_id);
CREATE INDEX idx_suballoc_batch ON public.subject_allocations(batch_id);
CREATE INDEX idx_suballoc_semester ON public.subject_allocations(semester_id);
CREATE INDEX idx_suballoc_faculty ON public.subject_allocations(faculty_id);

-- ==============================================================
-- VALIDATION TRIGGERS (DATABASE LEVEL INTEGRITY)
-- ==============================================================

-- 1. Ensure only 'instructor' or 'hod' roles can be assigned.
CREATE OR REPLACE FUNCTION validate_faculty_role()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = NEW.faculty_id;
    -- Note: DB legacy role is 'instructor', but some are mapped as 'faculty'
    IF user_role NOT IN ('instructor', 'faculty', 'hod') THEN
        RAISE EXCEPTION 'Invalid Allocation. Only users with Faculty or HOD roles can be allocated subjects.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_faculty_role
BEFORE INSERT OR UPDATE ON public.subject_allocations
FOR EACH ROW EXECUTE FUNCTION validate_faculty_role();


-- 2. Ensure the Batch actually belongs to the assigned Semester.
-- This prevents orphan matching (e.g., assigning a Sem 1 batch to a Sem 2 allocation row)
CREATE OR REPLACE FUNCTION validate_batch_semester_match()
RETURNS TRIGGER AS $$
DECLARE
    actual_semester_id UUID;
BEGIN
    SELECT semester_id INTO actual_semester_id FROM public.batches WHERE id = NEW.batch_id;
    IF actual_semester_id != NEW.semester_id THEN
        RAISE EXCEPTION 'Data Integrity Violation: The selected Batch does not belong to the selected Semester.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_batch_semester_match
BEFORE INSERT OR UPDATE ON public.subject_allocations
FOR EACH ROW EXECUTE FUNCTION validate_batch_semester_match();
