-- ==============================================================
-- ACADEMIC STRUCTURE SCHEMA (College ERP)
-- ==============================================================
-- Designed for scale, normalization, and strict referential integrity.

-- 1. Departments Table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'CMPN', 'IT'
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code-based lookups
CREATE INDEX idx_departments_code ON public.departments(code);

-- 2. Academic Years Table (FY, SY, TY, LY)
CREATE TABLE public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    year_level VARCHAR(10) NOT NULL, -- e.g., 'FY', 'SY'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- A department can only have one instance of a specific year level
    CONSTRAINT uq_dept_year UNIQUE(department_id, year_level) 
);

-- 3. Semesters Table
CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Enforce exactly semesters 1 or 2
    CONSTRAINT chk_term_number CHECK (term_number IN (1, 2)),
    -- Prevent duplicate equivalent semesters in the same year
    CONSTRAINT uq_year_term UNIQUE(academic_year_id, term_number) 
);

-- 4. Batches Table
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    name VARCHAR(20) NOT NULL, -- e.g., 'B1', 'B2', 'T1'
    capacity INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate batch names inside the exact same semester
    CONSTRAINT uq_semester_batch UNIQUE(semester_id, name)
);

CREATE INDEX idx_batches_semester ON public.batches(semester_id);

-- 5. Subjects Table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'CS101'
    name VARCHAR(100) NOT NULL,
    credits NUMERIC(3, 1) NOT NULL CHECK (credits > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('Theory', 'Practical', 'Audit')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subjects_dept ON public.subjects(department_id);

-- 6. Subject Assignments Table (Mapping Table)
-- Handles complex relationships assigning subjects to Years, Semesters, or specific Batches
CREATE TABLE public.subject_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE, -- Nullable if assigned to the whole semester
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate assignments
    CONSTRAINT uq_subject_assignment UNIQUE (subject_id, semester_id, batch_id)
);

-- Optimized indexes for dashboard joins
CREATE INDEX idx_sub_assign_subject ON public.subject_assignments(subject_id);
CREATE INDEX idx_sub_assign_semester ON public.subject_assignments(semester_id);
CREATE INDEX idx_sub_assign_batch ON public.subject_assignments(batch_id);

-- ==============================================================
-- AUTOMATION TRIGGERS
-- ==============================================================

-- Trigger to automatically create 2 semesters when an Academic Year is created
CREATE OR REPLACE FUNCTION auto_create_semesters()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.semesters (academic_year_id, term_number) VALUES
    (NEW.id, 1),
    (NEW.id, 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_semesters
AFTER INSERT ON public.academic_years
FOR EACH ROW
EXECUTE FUNCTION auto_create_semesters();
