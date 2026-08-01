-- ==============================================================================
-- PHASE 10: STUDENT 360° PROFILE & ENTERPRISE AUDIT TRAIL
-- Additive, non-destructive SQL migration creating enterprise_audit_logs and
-- student_activity_logs, and seeding sample data for immediate verification.
-- ==============================================================================

-- ─── 1. Create public.enterprise_audit_logs Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name       VARCHAR(100) DEFAULT 'System Administrator',
    user_email      VARCHAR(150),
    role            VARCHAR(50) DEFAULT 'admin',
    action          VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PROMOTE', 'REGISTER', 'IMPORT', 'EXPORT'
    module          VARCHAR(100) NOT NULL, -- 'STUDENT_360', 'LIFECYCLE', 'REGISTRATION', 'PROMOTION', 'BULK_DATA', 'REPORTING', 'ANNOUNCEMENT'
    affected_record VARCHAR(200),
    old_value       JSONB       DEFAULT '{}'::jsonb,
    new_value       JSONB       DEFAULT '{}'::jsonb,
    ip_address      VARCHAR(50) DEFAULT '127.0.0.1',
    device_info     VARCHAR(200) DEFAULT 'Mozilla/5.0 (Enterprise Client)',
    browser         VARCHAR(100) DEFAULT 'Chrome Enterprise',
    status          VARCHAR(50) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'OVERRIDE', 'WARNING')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.enterprise_audit_logs IS
  'Immutable enterprise audit trail capturing all administrative, academic, and system modifications across ERP modules.';

-- ─── 2. Create public.student_activity_logs Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_activity_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type   VARCHAR(50) NOT NULL CHECK (activity_type IN ('PORTAL_LOGIN', 'PASSWORD_CHANGE', 'PROFILE_UPDATE', 'FILE_DOWNLOAD', 'FILE_UPLOAD', 'ASSIGNMENT_SUBMISSION', 'COURSE_REGISTRATION', 'NOTIFICATION_READ', 'SYSTEM_USAGE')),
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    metadata        JSONB       DEFAULT '{}'::jsonb,
    ip_address      VARCHAR(50) DEFAULT '127.0.0.1',
    device_info     VARCHAR(200) DEFAULT 'Mozilla/5.0 (Student Workstation)',
    activity_time   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_activity_logs IS
  'Activity history logs for student portal interactions and self-service academic actions.';

-- ─── 3. Indexes for Super-Fast Search Engine & Analytics ──────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.enterprise_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.enterprise_audit_logs(module, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.enterprise_audit_logs(user_id, role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_affected ON public.enterprise_audit_logs(affected_record);

CREATE INDEX IF NOT EXISTS idx_student_activity_student ON public.student_activity_logs(student_id, activity_time DESC);
CREATE INDEX IF NOT EXISTS idx_student_activity_type ON public.student_activity_logs(activity_type);

-- ─── 4. Idempotent Row Level Security (RLS) Policies ──────────────────────────
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins, Deans, and HODs can read all audit logs
DROP POLICY IF EXISTS "Staff can view enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "Staff can view enterprise audit logs"
    ON public.enterprise_audit_logs FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean', 'hod', 'faculty')
        )
    );

-- Backend service role and authenticated users can insert audit logs
DROP POLICY IF EXISTS "Service and staff can insert audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "Service and staff can insert audit logs"
    ON public.enterprise_audit_logs FOR INSERT
    WITH CHECK (auth.role() IN ('service_role', 'authenticated', 'anon'));

-- Students can view their own activity logs; Staff can view all
DROP POLICY IF EXISTS "Users can view student activity logs" ON public.student_activity_logs;
CREATE POLICY "Users can view student activity logs"
    ON public.student_activity_logs FOR SELECT
    USING (
        auth.uid() = student_id OR
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'dean', 'hod', 'faculty')
        )
    );

DROP POLICY IF EXISTS "Service and users can insert activity logs" ON public.student_activity_logs;
CREATE POLICY "Service and users can insert activity logs"
    ON public.student_activity_logs FOR INSERT
    WITH CHECK (auth.role() IN ('service_role', 'authenticated', 'anon'));

-- ─── 5. Seed Demo Enterprise Audit Logs & Activity Logs ───────────────────────
DO $$
DECLARE
    sample_student_id UUID;
    admin_id UUID;
BEGIN
    -- Find an existing student or fallback to a dummy UUID for foreign key integrity
    SELECT id INTO sample_student_id FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

    -- Only insert seed logs if table is empty
    IF NOT EXISTS (SELECT 1 FROM public.enterprise_audit_logs LIMIT 1) THEN
        INSERT INTO public.enterprise_audit_logs (
            user_id, user_name, user_email, role, action, module, affected_record, old_value, new_value, status, timestamp
        ) VALUES
        (
            admin_id, 'Dr. Aris Thorne (Registrar)', 'registrar@mit.edu', 'admin',
            'PROMOTE_BATCH', 'ACADEMIC_PROMOTION', 'B.Tech CSE - 2024 Batch',
            '{"semester": 3, "status": "ACTIVE"}'::jsonb,
            '{"semester": 4, "status": "PROMOTED", "promoted_count": 58}'::jsonb,
            'SUCCESS', now() - interval '2 days'
        ),
        (
            admin_id, 'Prof. Elena Rostova (Dean Academics)', 'dean@mit.edu', 'dean',
            'APPROVE_RULE', 'ACADEMIC_RULES', 'Rule-104 (75% Attendance Threshold)',
            '{"is_active": false}'::jsonb,
            '{"is_active": true, "threshold_pct": 75}'::jsonb,
            'SUCCESS', now() - interval '3 days'
        ),
        (
            admin_id, 'System Automation Daemon', 'system@mit.edu', 'admin',
            'BULK_IMPORT', 'BULK_DATA', 'Student Enrollments CSV Upload',
            '{}'::jsonb,
            '{"imported_rows": 120, "errors": 0, "file_name": "enrollments_spring2026.csv"}'::jsonb,
            'SUCCESS', now() - interval '5 days'
        ),
        (
            admin_id, 'Dr. Rajesh Rao (HOD CSE)', 'hodcse@mit.edu', 'hod',
            'ADMIN_OVERRIDE', 'STUDENT_LIFECYCLE', 'Student #ENR2024-8831',
            '{"lifecycle_status": "DETAINED"}'::jsonb,
            '{"lifecycle_status": "ACTIVE", "reason": "Medical certificate verified by Dean"}'::jsonb,
            'OVERRIDE', now() - interval '1 day'
        ),
        (
            admin_id, 'Prof. Anita Sharma (Examination Controller)', 'exams@mit.edu', 'admin',
            'PUBLISH_RESULTS', 'REPORTING', 'Semester IV Final Examination Results',
            '{"status": "DRAFT"}'::jsonb,
            '{"status": "PUBLISHED", "total_students": 140, "pass_percentage": 92.5}'::jsonb,
            'SUCCESS', now() - interval '6 hours'
        );
        RAISE NOTICE 'Seeded 5 demo enterprise audit log records';
    END IF;

    -- Seed sample activity logs if student exists
    IF sample_student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.student_activity_logs LIMIT 1) THEN
        INSERT INTO public.student_activity_logs (
            student_id, activity_type, title, description, metadata, activity_time
        ) VALUES
        (
            sample_student_id, 'PORTAL_LOGIN', 'Successful Portal Authentication',
            'Student logged into self-service portal from Chrome Mac OS X',
            '{"login_method": "SSO_JWT", "location": "MIT Campus WiFi"}'::jsonb,
            now() - interval '1 hour'
        ),
        (
            sample_student_id, 'COURSE_REGISTRATION', 'Registered for Spring Semester Electives',
            'Enrolled in CS402 (Advanced AI) and CS408 (Cloud Architecture)',
            '{"total_credits": 18, "status": "CONFIRMED"}'::jsonb,
            now() - interval '24 hours'
        ),
        (
            sample_student_id, 'FILE_DOWNLOAD', 'Downloaded Semester III Grade Card',
            'Downloaded official digital transcript PDF',
            '{"document_id": "CERT-2025-081", "verification_hash": "SHA256-88a1b"}'::jsonb,
            now() - interval '3 days'
        ),
        (
            sample_student_id, 'ASSIGNMENT_SUBMISSION', 'Submitted Assignment #3: DistSys Lab',
            'Uploaded distributed_raft_consensus.zip to assignment drop box',
            '{"file_size_kb": 2450, "on_time": true}'::jsonb,
            now() - interval '5 days'
        );
        RAISE NOTICE 'Seeded 4 demo student activity log records';
    END IF;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
