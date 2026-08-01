-- ==============================================================
-- MIGRATION: DYNAMIC EXAMINATION ARCHITECTURE
-- ==============================================================
-- Introduces a flexible exam components table to replace hardcoded
-- 'internal' and 'external' columns, allowing diverse assessment
-- methodologies across different programs and subjects.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.exam_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    weightage NUMERIC(5, 2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    max_marks NUMERIC(5, 2) NOT NULL CHECK (max_marks > 0),
    passing_marks NUMERIC(5, 2) NOT NULL CHECK (passing_marks >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure passing marks don't exceed max marks
    CONSTRAINT chk_passing_max_marks CHECK (passing_marks <= max_marks)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.exam_components ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (assuming anyone can read exam components)
CREATE POLICY "Exam components are viewable by everyone"
    ON public.exam_components FOR SELECT
    USING (true);

-- Generic updated_at function if not exists
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exam_comp_updated_at ON public.exam_components;
CREATE TRIGGER trg_exam_comp_updated_at
    BEFORE UPDATE ON public.exam_components
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- ==============================================================
-- SEED DATA: Standard Examples
-- ==============================================================
INSERT INTO public.exam_components (name, weightage, max_marks, passing_marks) VALUES
    ('Internal', 20.00, 20.00, 8.00),
    ('Assignment', 10.00, 10.00, 4.00),
    ('Quiz', 10.00, 10.00, 4.00),
    ('Mid Semester', 30.00, 30.00, 12.00),
    ('Practical', 50.00, 50.00, 20.00),
    ('Viva', 20.00, 20.00, 8.00),
    ('End Semester', 60.00, 60.00, 24.00)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
