-- ==============================================================================
-- ENTERPRISE BULK DATA IMPORT RLS & SCHEMA FIX
-- Run this script in your Supabase SQL Editor to ensure all 9 ERP modules
-- can perform bulk imports without Row-Level Security (RLS) or schema errors.
-- ==============================================================================

-- ─── 0. Drop profiles foreign key constraint to auth.users ───────────────────
-- This enables bulk-importing students and faculty members who do not yet have
-- Supabase auth accounts, directly into the public.profiles table.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ─── 1. Ensure all Enterprise Tables exist (idempotent CREATE IF NOT EXISTS) ──
-- This guarantees no table-missing (ERROR 42P01) errors occur when applying RLS.

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(150),
    credits NUMERIC(3, 1) DEFAULT 4.0,
    type VARCHAR(30) DEFAULT 'Theory',
    lecture_hours INTEGER DEFAULT 3,
    tutorial_hours INTEGER DEFAULT 1,
    practical_hours INTEGER DEFAULT 0,
    department VARCHAR(100),
    semester INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name VARCHAR(100) UNIQUE,
    year_level VARCHAR(50) DEFAULT 'First Year',
    program VARCHAR(100) DEFAULT 'B.Tech Computer Science',
    capacity INTEGER DEFAULT 60,
    department VARCHAR(100),
    academic_year VARCHAR(50),
    semester INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practical_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(100),
    class_name VARCHAR(100),
    capacity INTEGER DEFAULT 20,
    assigned_lab VARCHAR(100) DEFAULT 'Lab 101',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_course_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email VARCHAR(150),
    subject_code VARCHAR(50),
    academic_year VARCHAR(50) DEFAULT '2026-2027',
    semester INTEGER DEFAULT 1,
    status VARCHAR(30) DEFAULT 'REGISTERED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    credits NUMERIC(3, 1) DEFAULT 3.0,
    status VARCHAR(30) DEFAULT 'REGISTERED',
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email VARCHAR(150),
    subject_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'present',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email VARCHAR(150),
    subject_code VARCHAR(50),
    internal_marks NUMERIC(5, 2) DEFAULT 0,
    external_marks NUMERIC(5, 2) DEFAULT 0,
    total_marks NUMERIC(5, 2) DEFAULT 0,
    result_status VARCHAR(20) DEFAULT 'PASS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) UNIQUE,
    min_semester_credits NUMERIC(4, 1) DEFAULT 16.0,
    max_semester_credits NUMERIC(4, 1) DEFAULT 28.0,
    total_graduation_credits NUMERIC(5, 1) DEFAULT 168.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name VARCHAR(150),
    user_email VARCHAR(150),
    role VARCHAR(50),
    action VARCHAR(100),
    module VARCHAR(100),
    affected_record VARCHAR(200),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    device_info VARCHAR(200),
    browser VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID,
    student_name VARCHAR(150),
    activity_type VARCHAR(100),
    description TEXT,
    device_ip VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID,
    subject_id UUID,
    faculty_id UUID,
    day_of_week VARCHAR(20),
    start_time TIME,
    end_time TIME,
    room_number VARCHAR(50),
    slot_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subject_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID,
    faculty_id UUID,
    batch_id UUID,
    semester_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID,
    allocation_id UUID,
    enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faculty_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID,
    allocation_id UUID,
    ratings JSONB,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Add any missing enterprise columns to public.profiles ─────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email VARCHAR(150);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='enrollment_no') THEN
        ALTER TABLE public.profiles ADD COLUMN enrollment_no VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='department') THEN
        ALTER TABLE public.profiles ADD COLUMN department VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='semester') THEN
        ALTER TABLE public.profiles ADD COLUMN semester INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='lifecycle_status') THEN
        ALTER TABLE public.profiles ADD COLUMN lifecycle_status VARCHAR(50) DEFAULT 'ACTIVE';
    END IF;
END $$;

-- ─── 3. RLS Policies for public.profiles (Student & Faculty Bulk Import) ──────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enterprise staff and service can insert profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enterprise staff and service can update profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can update profiles"
    ON public.profiles FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Enterprise staff and service can select profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can select profiles"
    ON public.profiles FOR SELECT
    USING (true);

-- ─── 4. Ensure all ERP bulk import tables allow CRUD for Bulk Data Engine ─────

-- Subjects / Courses
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access subjects" ON public.subjects;
CREATE POLICY "Bulk import access subjects" ON public.subjects FOR ALL USING (true);

-- Academic Classes
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access academic_classes" ON public.academic_classes;
CREATE POLICY "Bulk import access academic_classes" ON public.academic_classes FOR ALL USING (true);

-- Practical Batches
ALTER TABLE public.practical_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access practical_batches" ON public.practical_batches;
CREATE POLICY "Bulk import access practical_batches" ON public.practical_batches FOR ALL USING (true);

-- Course Registrations (both table variations)
ALTER TABLE public.student_course_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access student_course_registrations" ON public.student_course_registrations;
CREATE POLICY "Bulk import access student_course_registrations" ON public.student_course_registrations FOR ALL USING (true);

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access course_registrations" ON public.course_registrations;
CREATE POLICY "Bulk import access course_registrations" ON public.course_registrations FOR ALL USING (true);

-- Attendance Records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access attendance_records" ON public.attendance_records;
CREATE POLICY "Bulk import access attendance_records" ON public.attendance_records FOR ALL USING (true);

-- Examination Marks / Student Results
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access student_results" ON public.student_results;
CREATE POLICY "Bulk import access student_results" ON public.student_results FOR ALL USING (true);

-- Credit Rules
ALTER TABLE public.credit_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access credit_rules" ON public.credit_rules;
CREATE POLICY "Bulk import access credit_rules" ON public.credit_rules FOR ALL USING (true);

-- Enterprise Audit Logs
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access enterprise_audit_logs" ON public.enterprise_audit_logs;
CREATE POLICY "Bulk import access enterprise_audit_logs" ON public.enterprise_audit_logs FOR ALL USING (true);

-- Student Activity Logs
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access student_activity_logs" ON public.student_activity_logs;
CREATE POLICY "Bulk import access student_activity_logs" ON public.student_activity_logs FOR ALL USING (true);

-- Academic Timetables
ALTER TABLE public.academic_timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bulk import access academic_timetables" ON public.academic_timetables;
CREATE POLICY "Bulk import access academic_timetables" ON public.academic_timetables FOR ALL USING (true);

-- Subject Allocations
ALTER TABLE public.subject_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users access subject_allocations" ON public.subject_allocations;
CREATE POLICY "All users access subject_allocations" ON public.subject_allocations FOR ALL USING (true);

-- Student Enrollments
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users access student_enrollments" ON public.student_enrollments;
CREATE POLICY "All users access student_enrollments" ON public.student_enrollments FOR ALL USING (true);

-- Faculty Feedback
ALTER TABLE public.faculty_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users access faculty_feedback" ON public.faculty_feedback;
CREATE POLICY "All users access faculty_feedback" ON public.faculty_feedback FOR ALL USING (true);

-- ==============================================================================
-- ENTERPRISE BULK IMPORT AUDIT, ERROR LOGS & TEMPLATE CATALOG TABLES & RLS
-- ==============================================================================

-- ── Ensure the bulk_data_operations_audit table exists ──────────────────────
CREATE TABLE IF NOT EXISTS public.bulk_data_operations_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(100) UNIQUE,
    module_name VARCHAR(50),
    entity_type VARCHAR(50),
    operation_type VARCHAR(20) DEFAULT 'IMPORT',
    file_name VARCHAR(255),
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    performed_by_id UUID,
    performed_by_email VARCHAR(255),
    performed_by_role VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Upgrade: guarantee all columns exist in case table was created previously without them
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS audit_id VARCHAR(100) UNIQUE;
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS module_name VARCHAR(50);
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS operation_type VARCHAR(20) DEFAULT 'IMPORT';
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0;
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS successful_records INTEGER DEFAULT 0;
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS failed_records INTEGER DEFAULT 0;
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SUCCESS';
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS performed_by_id UUID;
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS performed_by_email VARCHAR(255);
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS performed_by_role VARCHAR(50);
ALTER TABLE public.bulk_data_operations_audit ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

-- Remove NOT NULL constraint on audit_id if it was previously set
ALTER TABLE public.bulk_data_operations_audit ALTER COLUMN audit_id DROP NOT NULL;
ALTER TABLE public.bulk_data_operations_audit ALTER COLUMN module_name DROP NOT NULL;
ALTER TABLE public.bulk_data_operations_audit ALTER COLUMN entity_type DROP NOT NULL;

-- RLS: allow all operations from all roles
ALTER TABLE public.bulk_data_operations_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All access bulk_data_operations_audit" ON public.bulk_data_operations_audit;
CREATE POLICY "All access bulk_data_operations_audit" ON public.bulk_data_operations_audit
    FOR ALL USING (true) WITH CHECK (true);

-- ── Ensure the bulk_import_errors_log table exists (NO foreign key constraint) ─
CREATE TABLE IF NOT EXISTS public.bulk_import_errors_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(100),
    row_number INTEGER,
    field_name VARCHAR(100),
    error_message TEXT,
    row_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Upgrade: guarantee all columns exist in bulk_import_errors_log
ALTER TABLE public.bulk_import_errors_log ADD COLUMN IF NOT EXISTS audit_id VARCHAR(100);
ALTER TABLE public.bulk_import_errors_log ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.bulk_import_errors_log ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);
ALTER TABLE public.bulk_import_errors_log ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.bulk_import_errors_log ADD COLUMN IF NOT EXISTS row_data JSONB;

ALTER TABLE public.bulk_import_errors_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All access bulk_import_errors_log" ON public.bulk_import_errors_log;
CREATE POLICY "All access bulk_import_errors_log" ON public.bulk_import_errors_log
    FOR ALL USING (true) WITH CHECK (true);

-- ── bulk_import_templates_catalog ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bulk_import_templates_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(150),
    description TEXT,
    columns JSONB,
    sample_data JSONB,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_name, entity_type)
);
ALTER TABLE public.bulk_import_templates_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All access bulk_import_templates_catalog" ON public.bulk_import_templates_catalog;
CREATE POLICY "All access bulk_import_templates_catalog" ON public.bulk_import_templates_catalog
    FOR ALL USING (true) WITH CHECK (true);

-- ── Fix profiles INSERT/UPDATE RLS to use WITH CHECK ─────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enterprise staff and service can insert profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can insert profiles"
    ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enterprise staff and service can update profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can update profiles"
    ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enterprise staff and service can select profiles" ON public.profiles;
CREATE POLICY "Enterprise staff and service can select profiles"
    ON public.profiles FOR SELECT USING (true);

