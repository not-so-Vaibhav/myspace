-- ==============================================================
-- ACADEMIC PROGRAMS & GRADING SCHEMES REFACTORING
-- ==============================================================
-- This migration introduces multi-program support to the LMS.
-- It normalizes grading schemes and links existing academic
-- structures (semesters, subjects, courses) to programs without
-- breaking existing data through a zero-loss migration strategy.
-- ==============================================================

-- 1. Create Grading Schemes Tables
-- Note: Normalized into two tables to correctly support the FK from programs
CREATE TABLE IF NOT EXISTS public.grading_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grading_scheme_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grading_scheme_id UUID REFERENCES public.grading_schemes(id) ON DELETE CASCADE,
    grade VARCHAR(5) NOT NULL,
    min_marks NUMERIC(5,2) NOT NULL,
    max_marks NUMERIC(5,2) NOT NULL,
    grade_points NUMERIC(4,2) NOT NULL,
    is_pass BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_scheme_grade UNIQUE(grading_scheme_id, grade)
);

-- 2. Create Programs Table
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    duration_years INT NOT NULL CHECK (duration_years > 0),
    total_semesters INT NOT NULL CHECK (total_semesters > 0),
    total_credits INT,
    grading_scheme_id UUID REFERENCES public.grading_schemes(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_programs_department ON public.programs(department_id);
CREATE INDEX IF NOT EXISTS idx_programs_code ON public.programs(code);

-- 3. Extend Existing Tables
-- A. Subjects
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT;

-- B. Academic Years
ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT;

-- C. Semesters
ALTER TABLE public.semesters
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT;

-- D. Courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;


-- ==============================================================
-- 4. ZERO DATA-LOSS MIGRATION
-- ==============================================================
-- This block auto-creates a default grading scheme and default 
-- programs for each existing department, then links all existing
-- subjects, semesters, and academic years to them.
DO $$
DECLARE
    default_scheme_id UUID;
    dept RECORD;
    new_program_id UUID;
BEGIN
    -- Check if we already have a default scheme to prevent duplication on re-runs
    SELECT id INTO default_scheme_id FROM public.grading_schemes WHERE scheme_name = 'Default 10-Point UGC';
    
    IF default_scheme_id IS NULL THEN
        -- Create a default grading scheme
        INSERT INTO public.grading_schemes (scheme_name, description) 
        VALUES ('Default 10-Point UGC', 'Auto-generated standard 10-point scale scheme')
        RETURNING id INTO default_scheme_id;

        -- Add default grades
        INSERT INTO public.grading_scheme_grades (grading_scheme_id, grade, min_marks, max_marks, grade_points, is_pass) VALUES
        (default_scheme_id, 'O',  90, 100, 10.0, TRUE),
        (default_scheme_id, 'A+', 80, 89.99, 9.0, TRUE),
        (default_scheme_id, 'A',  70, 79.99, 8.0, TRUE),
        (default_scheme_id, 'B+', 60, 69.99, 7.0, TRUE),
        (default_scheme_id, 'B',  50, 59.99, 6.0, TRUE),
        (default_scheme_id, 'C',  40, 49.99, 5.0, TRUE),
        (default_scheme_id, 'F',  0,  39.99, 0.0, FALSE);
    END IF;

    -- Loop through all existing departments to create a default program for each
    FOR dept IN SELECT id, code, name FROM public.departments LOOP
        -- Check if a general program already exists for this department
        SELECT id INTO new_program_id FROM public.programs WHERE code = dept.code || '-GEN';

        IF new_program_id IS NULL THEN
            INSERT INTO public.programs (
                department_id, code, name, duration_years, total_semesters, grading_scheme_id
            ) VALUES (
                dept.id, 
                dept.code || '-GEN', 
                'General ' || dept.name || ' Program',
                4, 
                8,
                default_scheme_id
            ) RETURNING id INTO new_program_id;
        END IF;

        -- Link existing records to the new default program
        -- (Only update where program_id is currently null to avoid overwriting real data)
        UPDATE public.subjects SET program_id = new_program_id WHERE department_id = dept.id AND program_id IS NULL;
        UPDATE public.academic_years SET program_id = new_program_id WHERE department_id = dept.id AND program_id IS NULL;
    END LOOP;

    -- Update semesters based on their academic_year's program_id
    UPDATE public.semesters s
    SET program_id = ay.program_id
    FROM public.academic_years ay
    WHERE s.academic_year_id = ay.id AND s.program_id IS NULL;

END $$;


-- ==============================================================
-- 5. APPLY INDEXES FOR NEW RELATIONS
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_subjects_program ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_program ON public.academic_years(program_id);
CREATE INDEX IF NOT EXISTS idx_semesters_program ON public.semesters(program_id);
CREATE INDEX IF NOT EXISTS idx_courses_program ON public.courses(program_id);

-- Migration complete.
