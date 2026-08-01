-- ==============================================================
-- MIGRATION: ACADEMIC CALENDAR ARCHITECTURE
-- ==============================================================
-- Centralized event tracking for the academic lifecycle.
-- Supports both year-level (e.g., Admissions) and 
-- semester-level (e.g., Mid Exams) events.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.academic_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- An event belongs to an academic year, but semester can be NULL 
    -- if it's a year-wide event (like early Admissions or general Vacation)
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    
    event_name VARCHAR(150) NOT NULL,
    description TEXT,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    status VARCHAR(30) NOT NULL DEFAULT 'Scheduled'
        CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Postponed', 'Cancelled')),
        
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure chronological sanity
    CONSTRAINT chk_calendar_dates 
        CHECK (end_date >= start_date)
);

-- ==============================================================
-- AUTOMATION TRIGGERS
-- ==============================================================
-- Ensure updated_at stays fresh
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_calendar_updated_at') THEN
        -- We reuse the generic updated_at function if it was created in a previous script, 
        -- otherwise we'll define a new one. (Assuming set_updated_at_column exists from exam_components)
        CREATE TRIGGER trg_calendar_updated_at
            BEFORE UPDATE ON public.academic_calendar
            FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        -- Fallback if set_updated_at_column doesn't exist
        CREATE OR REPLACE FUNCTION set_updated_at_fallback()
        RETURNS TRIGGER LANGUAGE plpgsql AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$;
        
        CREATE TRIGGER trg_calendar_updated_at
            BEFORE UPDATE ON public.academic_calendar
            FOR EACH ROW EXECUTE FUNCTION set_updated_at_fallback();
END $$;

-- ==============================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

-- Allow public read access (students/faculty need to see the calendar)
CREATE POLICY "Academic calendar is viewable by everyone"
    ON public.academic_calendar FOR SELECT
    USING (true);

-- ==============================================================
-- PERFORMANCE INDEXES
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_calendar_year ON public.academic_calendar(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sem ON public.academic_calendar(semester_id);
-- Fast lookup for "what is happening right now?"
CREATE INDEX IF NOT EXISTS idx_calendar_dates ON public.academic_calendar(start_date, end_date);
-- Fast lookup for status dashboards
CREATE INDEX IF NOT EXISTS idx_calendar_status ON public.academic_calendar(status);

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
