-- ==============================================================
-- MIGRATION: UPGRADE student_results TO PRODUCTION ERP LEVEL
-- ==============================================================
-- This script safely extends the student_results table with 
-- robust ERP-level tracking (status, credits, publication)
-- without breaking existing data.
-- ==============================================================

-- 1. Add new columns
ALTER TABLE public.student_results
    ADD COLUMN IF NOT EXISTS result_status VARCHAR(20) DEFAULT 'INCOMPLETE',
    ADD COLUMN IF NOT EXISTS credits_earned NUMERIC(3,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS exam_session VARCHAR(20) DEFAULT 'Regular',
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add Domain/Check Constraints
ALTER TABLE public.student_results
    ADD CONSTRAINT chk_result_status 
        CHECK (result_status IN ('PASS', 'FAIL', 'ABSENT', 'WITHHELD', 'INCOMPLETE', 'MALPRACTICE')),
    ADD CONSTRAINT chk_credits_earned 
        CHECK (credits_earned >= 0),
    ADD CONSTRAINT chk_exam_session 
        CHECK (exam_session IN ('Regular', 'Supplementary', 'ReExam', 'Summer', 'Winter')),
    ADD CONSTRAINT chk_published_consistency 
        CHECK (
            (is_published = FALSE) OR 
            (is_published = TRUE AND published_at IS NOT NULL AND published_by IS NOT NULL)
        );

-- 3. Data Backfill (Zero Data Loss Migration)
-- We intelligently map existing `is_pass` and `exam_type` to the new columns.
UPDATE public.student_results sr
SET 
    -- Map existing pass/fail boolean to the new enum
    result_status = CASE 
        WHEN sr.is_pass = TRUE THEN 'PASS' 
        WHEN sr.is_pass = FALSE THEN 'FAIL' 
        ELSE 'INCOMPLETE' 
    END,
    -- If they passed, award them the credits from the subjects table
    credits_earned = CASE 
        WHEN sr.is_pass = TRUE THEN (SELECT s.credits FROM public.subjects s WHERE s.id = sr.subject_id) 
        ELSE 0.0 
    END,
    -- Map ATKT to Supplementary session
    exam_session = CASE 
        WHEN sr.exam_type = 'Regular' THEN 'Regular' 
        ELSE 'Supplementary' 
    END;

-- 4. Apply Performance Indexes
CREATE INDEX IF NOT EXISTS idx_results_status ON public.student_results(result_status);
CREATE INDEX IF NOT EXISTS idx_results_exam_session ON public.student_results(exam_session);
CREATE INDEX IF NOT EXISTS idx_results_published ON public.student_results(is_published) WHERE is_published = TRUE;

-- Migration Complete.
