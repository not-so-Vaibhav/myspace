-- ==============================================================================
-- PHASE 5: ENTERPRISE ACADEMIC CREDIT SYSTEM (TCS iON / Oracle Campus / SAP)
-- ==============================================================================
-- 1. Extend subjects table with L-T-P hours, credit_type, & 0-credit support
-- 2. Configurable Credit Rules table (min/max sem credits, graduation, honours, minor)
-- 3. Enterprise Reporting Views for Credit Summary, Breakdown, Analytics & Backlogs
-- 4. Row Level Security Policies
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. EXTEND SUBJECTS TABLE WITH L-T-P & 0-CREDIT SUPPORT ───────────────────
DO $$ 
BEGIN
    -- Safely add lecture_hours (L)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='lecture_hours') THEN
        ALTER TABLE public.subjects ADD COLUMN lecture_hours INT NOT NULL DEFAULT 3 CHECK (lecture_hours >= 0);
    END IF;

    -- Safely add tutorial_hours (T)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='tutorial_hours') THEN
        ALTER TABLE public.subjects ADD COLUMN tutorial_hours INT NOT NULL DEFAULT 0 CHECK (tutorial_hours >= 0);
    END IF;

    -- Safely add practical_hours (P)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='practical_hours') THEN
        ALTER TABLE public.subjects ADD COLUMN practical_hours INT NOT NULL DEFAULT 0 CHECK (practical_hours >= 0);
    END IF;

    -- Safely add credit_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='credit_type') THEN
        ALTER TABLE public.subjects ADD COLUMN credit_type VARCHAR(50) DEFAULT 'Theory'
            CHECK (credit_type IN (
                'Theory', 'Practical', 'Tutorial', 'Project', 'Internship', 
                'Seminar', 'Industrial Training', 'Minor', 'Honours', 
                'Open Elective', 'Department Elective', 'Mandatory Non-Credit'
            ));
    END IF;

    -- Safely add is_mandatory_non_credit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='is_mandatory_non_credit') THEN
        ALTER TABLE public.subjects ADD COLUMN is_mandatory_non_credit BOOLEAN DEFAULT false;
    END IF;

    -- Update check constraint to support 0-credit courses (NSS, Internship, Mandatory Non-Credit)
    ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_credits_check;
    ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS chk_subjects_credits;
    ALTER TABLE public.subjects ADD CONSTRAINT chk_subjects_credits CHECK (credits >= 0);
END $$;

-- ── 2. CONFIGURABLE CREDIT RULES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    min_semester_credits NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
    max_semester_credits NUMERIC(4, 1) NOT NULL DEFAULT 26.0,
    graduation_required_credits NUMERIC(5, 1) NOT NULL DEFAULT 160.0,
    honours_required_credits NUMERIC(4, 1) NOT NULL DEFAULT 20.0,
    minor_required_credits NUMERIC(4, 1) NOT NULL DEFAULT 18.0,
    max_elective_credits_per_sem NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
    max_open_elective_credits_per_sem NUMERIC(4, 1) NOT NULL DEFAULT 6.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_rules_active ON public.credit_rules(is_active);

-- Insert default institutional credit policy if table is empty
INSERT INTO public.credit_rules (
    rule_name,
    min_semester_credits,
    max_semester_credits,
    graduation_required_credits,
    honours_required_credits,
    minor_required_credits,
    max_elective_credits_per_sem,
    max_open_elective_credits_per_sem,
    is_active
)
VALUES (
    'Standard Institutional Credit Policy (2026)',
    12.0,
    26.0,
    160.0,
    20.0,
    18.0,
    12.0,
    6.0,
    true
)
ON CONFLICT (rule_name) DO NOTHING;

-- ── 3. ENTERPRISE REPORTING VIEWS FOR CREDIT SUMMARY & ANALYTICS ─────────────

-- A. v_student_credit_summary: Complete credit standing per student
CREATE OR REPLACE VIEW public.v_student_credit_summary AS
WITH student_courses AS (
    SELECT 
        p.id AS student_id,
        p.full_name,
        p.email,
        p.department,
        p.semester,
        cr.semester_id,
        cr.status,
        cr.credits,
        s.credit_type,
        s.is_mandatory_non_credit,
        s.category
    FROM public.profiles p
    LEFT JOIN public.course_registrations cr ON cr.student_id = p.id
    LEFT JOIN public.subjects s ON s.id = cr.subject_id
    WHERE p.role = 'student'
),
student_results_summary AS (
    SELECT 
        r.student_id,
        SUM(sub.credits) FILTER (WHERE r.is_pass = true) AS earned_credits,
        SUM(sub.credits) FILTER (WHERE r.is_pass = false) AS failed_credits,
        SUM(sub.credits) FILTER (WHERE sub.credit_type = 'Minor' AND r.is_pass = true) AS minor_credits_earned,
        SUM(sub.credits) FILTER (WHERE sub.credit_type = 'Honours' AND r.is_pass = true) AS honours_credits_earned
    FROM public.student_results r
    JOIN public.subjects sub ON sub.id = r.subject_id
    WHERE r.is_published = true
    GROUP BY r.student_id
),
backlog_summary AS (
    SELECT
        b.student_id,
        COALESCE(SUM(sub.credits), 0) AS backlog_credits
    FROM public.backlog_records b
    JOIN public.subjects sub ON sub.id = b.subject_id
    WHERE b.status = 'pending'
    GROUP BY b.student_id
),
active_rule AS (
    SELECT 
        graduation_required_credits,
        min_semester_credits,
        max_semester_credits,
        honours_required_credits,
        minor_required_credits
    FROM public.credit_rules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    sc.student_id,
    sc.full_name,
    sc.email,
    sc.department,
    sc.semester,
    sc.semester_id,
    COALESCE(SUM(sc.credits) FILTER (WHERE sc.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')), 0) AS registered_credits,
    COALESCE(srs.earned_credits, 0) AS earned_credits,
    COALESCE(srs.earned_credits, 0) AS completed_credits,
    COALESCE(srs.failed_credits, 0) AS failed_credits,
    COALESCE(bs.backlog_credits, 0) AS backlog_credits,
    GREATEST(0, COALESCE(SUM(sc.credits) FILTER (WHERE sc.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')), 0) - COALESCE(srs.earned_credits, 0)) AS pending_credits,
    COALESCE(ar.graduation_required_credits, 160.0) AS graduation_required_credits,
    GREATEST(0, COALESCE(ar.graduation_required_credits, 160.0) - COALESCE(srs.earned_credits, 0)) AS remaining_graduation_credits,
    CASE 
        WHEN COALESCE(ar.graduation_required_credits, 160.0) > 0 THEN
            ROUND((COALESCE(srs.earned_credits, 0) / COALESCE(ar.graduation_required_credits, 160.0)) * 100, 1)
        ELSE 0.0
    END AS graduation_progress_percentage,
    COALESCE(srs.minor_credits_earned, 0) AS minor_credits_earned,
    COALESCE(srs.honours_credits_earned, 0) AS honours_credits_earned
FROM student_courses sc
LEFT JOIN student_results_summary srs ON srs.student_id = sc.student_id
LEFT JOIN backlog_summary bs ON bs.student_id = sc.student_id
CROSS JOIN (
    SELECT * FROM active_rule 
    UNION ALL 
    SELECT 160.0, 12.0, 26.0, 20.0, 18.0 WHERE NOT EXISTS (SELECT 1 FROM active_rule) 
    LIMIT 1
) ar
GROUP BY 
    sc.student_id, sc.full_name, sc.email, sc.department, sc.semester, sc.semester_id,
    srs.earned_credits, srs.failed_credits, srs.minor_credits_earned, srs.honours_credits_earned,
    bs.backlog_credits, ar.graduation_required_credits;

-- B. v_student_credit_breakdown: Breakdown by credit type (Theory, Practical, Tutorial, etc.)
CREATE OR REPLACE VIEW public.v_student_credit_breakdown AS
SELECT 
    p.id AS student_id,
    p.full_name,
    p.department,
    COALESCE(s.credit_type, 'Theory') AS credit_type,
    COUNT(cr.id) AS course_count,
    COALESCE(SUM(s.credits), 0) AS total_credits,
    COALESCE(SUM(s.credits) FILTER (WHERE r.is_pass = true), 0) AS earned_credits
FROM public.profiles p
JOIN public.course_registrations cr ON cr.student_id = p.id AND cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')
JOIN public.subjects s ON s.id = cr.subject_id
LEFT JOIN public.student_results r ON r.student_id = p.id AND r.subject_id = s.id AND r.is_published = true
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.department, s.credit_type;

-- C. v_credit_deficit_report: Identifies students falling behind standard credit progression
CREATE OR REPLACE VIEW public.v_credit_deficit_report AS
SELECT 
    s.student_id,
    s.full_name,
    s.department,
    s.semester,
    s.earned_credits,
    s.registered_credits,
    s.backlog_credits,
    s.remaining_graduation_credits,
    s.graduation_progress_percentage,
    -- Expected credits = semester * 20 (standard institutional average)
    GREATEST(0, (COALESCE(s.semester, 1) * 20.0) - s.earned_credits) AS credit_deficit
FROM public.v_student_credit_summary s
WHERE GREATEST(0, (COALESCE(s.semester, 1) * 20.0) - s.earned_credits) > 0;

-- D. v_department_credit_analytics: Department-level credit KPIs
CREATE OR REPLACE VIEW public.v_department_credit_analytics AS
SELECT 
    COALESCE(department, 'General') AS department,
    COUNT(DISTINCT student_id) AS total_students,
    ROUND(AVG(earned_credits), 1) AS avg_earned_credits,
    ROUND(AVG(registered_credits), 1) AS avg_registered_credits,
    ROUND(AVG(graduation_progress_percentage), 1) AS avg_graduation_progress,
    SUM(backlog_credits) AS total_department_backlog_credits
FROM public.v_student_credit_summary
GROUP BY department;

-- ── 4. ROW LEVEL SECURITY POLICIES ───────────────────────────────────────────
ALTER TABLE public.credit_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credit rules viewable by everyone" ON public.credit_rules
    FOR SELECT USING (true);

CREATE POLICY "Credit rules modifiable by admin" ON public.credit_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod')
        )
    );

-- ==============================================================================
-- PHASE 5 ACADEMIC CREDIT SYSTEM SCHEMA COMPLETE
-- ==============================================================================
