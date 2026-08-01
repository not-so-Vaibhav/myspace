-- ==============================================================================
-- PHASE 4: ENTERPRISE COURSE REGISTRATION SYSTEM (TCS iON / Oracle Campus style)
-- ==============================================================================
-- 1. Safely extend existing subjects table with category & credit limits
-- 2. Registration Windows table (Academic Year & Semester bounded)
-- 3. Enterprise Course Registrations table (with full lifecycle status)
-- 4. Registration Audit Logs table (immutable audit trail)
-- 5. Auto-sync Trigger to public.student_enrollments (zero LMS regression)
-- 6. Reporting Views for Analytics, Seat Utilization, Elective Popularity
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. EXTEND SUBJECTS & PROFILES TABLES (NON-BREAKING) ──────────────────────
DO $$ 
BEGIN
    -- Subjects table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='category') THEN
        ALTER TABLE public.subjects ADD COLUMN category VARCHAR(30) DEFAULT 'Core' 
            CHECK (category IN ('Core', 'Elective', 'Open Elective', 'Department Elective', 'Minor', 'Honours'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='default_capacity') THEN
        ALTER TABLE public.subjects ADD COLUMN default_capacity INT DEFAULT 60;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='min_credits') THEN
        ALTER TABLE public.subjects ADD COLUMN min_credits NUMERIC(4, 1) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subjects' AND column_name='max_credits') THEN
        ALTER TABLE public.subjects ADD COLUMN max_credits NUMERIC(4, 1) DEFAULT 30;
    END IF;

    -- Profiles table non-breaking metadata columns for reporting views
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='department') THEN
        ALTER TABLE public.profiles ADD COLUMN department TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='semester') THEN
        ALTER TABLE public.profiles ADD COLUMN semester INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='enrollment_no') THEN
        ALTER TABLE public.profiles ADD COLUMN enrollment_no TEXT;
    END IF;
END $$;

-- ── 2. COURSE REGISTRATION WINDOWS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_registration_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    min_credits NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
    max_credits NUMERIC(4, 1) NOT NULL DEFAULT 26.0,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'CLOSED', 'SCHEDULED')),
    allow_late_registration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_reg_window_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_reg_window_sem ON public.course_registration_windows(semester_id);
CREATE INDEX IF NOT EXISTS idx_reg_window_status ON public.course_registration_windows(status);

-- ── 3. ENTERPRISE COURSE REGISTRATIONS TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES public.subject_allocations(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    category VARCHAR(30) DEFAULT 'Core',
    credits NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED' 
        CHECK (status IN ('REGISTERED', 'DROPPED', 'AUTO_ASSIGNED', 'PENDING_APPROVAL', 'REJECTED', 'ADMIN_OVERRIDE')),
    registration_window_id UUID REFERENCES public.course_registration_windows(id) ON DELETE SET NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    dropped_at TIMESTAMPTZ,
    override_reason TEXT,
    CONSTRAINT uq_student_allocation_reg UNIQUE (student_id, allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reg_student ON public.course_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_course_reg_allocation ON public.course_registrations(allocation_id);
CREATE INDEX IF NOT EXISTS idx_course_reg_subject ON public.course_registrations(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_reg_status ON public.course_registrations(status);

-- ── 4. REGISTRATION AUDIT LOGS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registration_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    allocation_id UUID REFERENCES public.subject_allocations(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT,
    ip_address VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_student ON public.registration_audit_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.registration_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON public.registration_audit_logs(created_at);

-- ── 5. AUTO-SYNC TRIGGER TO PUBLIC.STUDENT_ENROLLMENTS ───────────────────────
-- Guarantees 100% interoperability with existing LMS features (attendance, materials, discussions)
CREATE OR REPLACE FUNCTION sync_registration_to_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')) THEN
        INSERT INTO public.student_enrollments (student_id, allocation_id, enrolled_at)
        VALUES (NEW.student_id, NEW.allocation_id, COALESCE(NEW.registered_at, NOW()))
        ON CONFLICT (student_id, allocation_id) DO NOTHING;
    ELSIF (NEW.status IN ('DROPPED', 'REJECTED')) THEN
        DELETE FROM public.student_enrollments
        WHERE student_id = NEW.student_id AND allocation_id = NEW.allocation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_registration_enrollment') THEN
        CREATE TRIGGER trg_sync_registration_enrollment
            AFTER INSERT OR UPDATE OF status ON public.course_registrations
            FOR EACH ROW EXECUTE FUNCTION sync_registration_to_enrollment();
    END IF;
END $$;

-- ── 6. ENTERPRISE REPORTING VIEWS FOR ANALYTICS ──────────────────────────────

-- A. SEAT UTILIZATION VIEW
CREATE OR REPLACE VIEW public.v_seat_utilization AS
SELECT 
    sa.id AS allocation_id,
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.category AS subject_category,
    s.credits AS subject_credits,
    b.name AS batch_name,
    p.full_name AS faculty_name,
    sa.semester_id,
    COALESCE(b.capacity, s.default_capacity, 60) AS capacity,
    COUNT(cr.id) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')) AS enrolled_count,
    CASE 
        WHEN COALESCE(b.capacity, s.default_capacity, 60) > 0 THEN
            ROUND((COUNT(cr.id) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE'))::numeric / 
            COALESCE(b.capacity, s.default_capacity, 60)::numeric) * 100, 1)
        ELSE 0 
    END AS utilization_percentage
FROM public.subject_allocations sa
JOIN public.subjects s ON s.id = sa.subject_id
LEFT JOIN public.batches b ON b.id = sa.batch_id
LEFT JOIN public.profiles p ON p.id = sa.faculty_id
LEFT JOIN public.course_registrations cr ON cr.allocation_id = sa.id
GROUP BY sa.id, s.id, s.code, s.name, s.category, s.credits, b.name, b.capacity, s.default_capacity, p.full_name, sa.semester_id;

-- B. ELECTIVE POPULARITY VIEW
CREATE OR REPLACE VIEW public.v_elective_popularity AS
SELECT 
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.category AS category,
    s.credits,
    COUNT(cr.id) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')) AS total_registered,
    COUNT(cr.id) FILTER (WHERE cr.status = 'DROPPED') AS total_dropped
FROM public.subjects s
LEFT JOIN public.course_registrations cr ON cr.subject_id = s.id
GROUP BY s.id, s.code, s.name, s.category, s.credits
ORDER BY total_registered DESC;

-- C. STUDENT REGISTRATION SUMMARY VIEW
CREATE OR REPLACE VIEW public.v_student_registration_summary AS
SELECT 
    p.id AS student_id,
    p.full_name,
    p.email,
    p.department,
    cr.semester_id,
    COUNT(cr.id) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')) AS registered_courses_count,
    COALESCE(SUM(cr.credits) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')), 0) AS total_credits_registered,
    COALESCE(SUM(cr.credits) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE') AND cr.category = 'Core'), 0) AS core_credits_registered,
    COALESCE(SUM(cr.credits) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE') AND cr.category != 'Core'), 0) AS elective_credits_registered
FROM public.profiles p
LEFT JOIN public.course_registrations cr ON cr.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email, p.department, cr.semester_id;

-- D. UNREGISTERED STUDENTS VIEW
CREATE OR REPLACE VIEW public.v_unregistered_students AS
SELECT 
    p.id AS student_id,
    p.full_name,
    p.email,
    p.department,
    p.semester,
    p.enrollment_no
FROM public.profiles p
WHERE p.role = 'student'
  AND NOT EXISTS (
      SELECT 1 FROM public.course_registrations cr
      WHERE cr.student_id = p.id 
        AND cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')
  );

-- E. DEPARTMENT REGISTRATION STATS VIEW
CREATE OR REPLACE VIEW public.v_course_registration_analytics AS
SELECT 
    p.department,
    COUNT(DISTINCT p.id) AS total_students,
    COUNT(DISTINCT CASE WHEN cr.id IS NOT NULL THEN p.id END) AS registered_students,
    CASE 
        WHEN COUNT(DISTINCT p.id) > 0 THEN
            ROUND((COUNT(DISTINCT CASE WHEN cr.id IS NOT NULL THEN p.id END)::numeric / COUNT(DISTINCT p.id)::numeric) * 100, 1)
        ELSE 0 
    END AS registration_completion_percentage,
    COALESCE(SUM(cr.credits) FILTER (WHERE cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')), 0) AS total_credits_allocated
FROM public.profiles p
LEFT JOIN public.course_registrations cr ON cr.student_id = p.id AND cr.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE')
WHERE p.role = 'student'
GROUP BY p.department;

-- ── 7. ROW LEVEL SECURITY POLICIES ───────────────────────────────────────────
ALTER TABLE public.course_registration_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_audit_logs ENABLE ROW LEVEL SECURITY;

-- Windows viewable by everyone, modifiable by admin/dean/hod
CREATE POLICY "Windows viewable by everyone" ON public.course_registration_windows
    FOR SELECT USING (true);

CREATE POLICY "Windows editable by admin" ON public.course_registration_windows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod')
        )
    );

-- Registrations readable by owner or faculty or admin
CREATE POLICY "Registrations read own" ON public.course_registrations
    FOR SELECT USING (
        auth.uid() = student_id OR
        EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod')
        )
    );

CREATE POLICY "Registrations insert own" ON public.course_registrations
    FOR INSERT WITH CHECK (
        auth.uid() = student_id OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod')
        )
    );

CREATE POLICY "Registrations update own" ON public.course_registrations
    FOR UPDATE USING (
        auth.uid() = student_id OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod', 'faculty', 'instructor')
        )
    );

-- Audit logs readable by admin/dean/hod
CREATE POLICY "Audit logs readable by admin" ON public.registration_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod')
        )
    );

CREATE POLICY "Audit logs insertable by all" ON public.registration_audit_logs
    FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- PHASE 4 COURSE REGISTRATION SCHEMA MIGRATION COMPLETE
-- ==============================================================================
