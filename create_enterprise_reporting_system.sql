-- ==============================================================================
-- PHASE 7: ENTERPRISE REPORTING & ANALYTICS SYSTEM
-- TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
-- ==============================================================================
-- Implements centralized Report Center catalog, Student Academic Timeline,
-- Saved & Favorite Reports, Report Generation Audit History, Scheduled Automatic Reports,
-- and Optimized Reporting SQL Views across all 8 ERP Categories.
--
-- CORE MANDATE: NON-BREAKING ADDITIONS ONLY (NO MODIFICATION OR DROP OF EXISTING TABLES)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PERMANENT STUDENT ACADEMIC TIMELINE TABLE
-- Captures every significant academic event from admission until graduation
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_academic_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'ADMISSION', 'SEMESTER_REGISTRATION', 'COURSE_REGISTRATION', 'ATTENDANCE', 'INTERNAL_MARKS', 'RESULTS', 'BACKLOG_CLEARANCE', 'PROMOTION', 'BATCH_CHANGE', 'GRADUATION', 'CERTIFICATE', 'DISCIPLINARY'
    title VARCHAR(150) NOT NULL,
    description TEXT,
    module_name VARCHAR(50) NOT NULL, -- 'REGISTRATION', 'EXAMINATION', 'ACADEMIC_BATCH', 'PROMOTION', 'CREDIT_SYSTEM', 'ADMINISTRATION'
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(100) DEFAULT 'System / Self',
    metadata JSONB DEFAULT '{}'::jsonb,
    event_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stud_timeline_student ON public.student_academic_timeline(student_id);
CREATE INDEX IF NOT EXISTS idx_stud_timeline_type ON public.student_academic_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_stud_timeline_date ON public.student_academic_timeline(event_date);

-- ==============================================================================
-- 2. ENTERPRISE REPORT DEFINITIONS CATALOG
-- Master catalogue of 50+ enterprise report types across 8 Categories
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.report_definitions_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('STUDENT', 'COURSE', 'ATTENDANCE', 'EXAMINATION', 'FACULTY', 'CLASS_BATCH', 'ADMIN', 'CREDIT')),
    report_name VARCHAR(150) NOT NULL,
    description TEXT,
    allowed_roles TEXT[] NOT NULL DEFAULT '{"admin","dean","hod"}',
    default_sort_col VARCHAR(50) DEFAULT 'created_at',
    supports_date_filter BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rep_catalog_category ON public.report_definitions_catalog(category);
CREATE INDEX IF NOT EXISTS idx_rep_catalog_code ON public.report_definitions_catalog(report_code);

-- ==============================================================================
-- 3. USER SAVED & FAVORITE REPORTS TABLE
-- Stores custom saved report filters and favorite reports per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_code VARCHAR(100) NOT NULL REFERENCES public.report_definitions_catalog(report_code) ON DELETE CASCADE,
    saved_name VARCHAR(150) NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_rep_user ON public.user_saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_rep_code ON public.user_saved_reports(report_code);

-- ==============================================================================
-- 4. REPORT GENERATION HISTORY (AUDIT TRAIL)
-- Tracks recently generated reports with execution metrics
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.report_generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(100) DEFAULT 'System',
    report_code VARCHAR(100) NOT NULL,
    report_name VARCHAR(150),
    filters_used JSONB DEFAULT '{}'::jsonb,
    row_count INT DEFAULT 0,
    execution_time_ms INT DEFAULT 0,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rep_hist_user ON public.report_generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rep_hist_code ON public.report_generation_history(report_code);
CREATE INDEX IF NOT EXISTS idx_rep_hist_date ON public.report_generation_history(generated_at);

-- ==============================================================================
-- 5. SCHEDULED AUTOMATIC REPORTS TABLE
-- Enables scheduled Daily/Weekly/Monthly/Semester-end automatic report emails
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_automatic_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code VARCHAR(100) NOT NULL REFERENCES public.report_definitions_catalog(report_code) ON DELETE CASCADE,
    schedule_frequency VARCHAR(30) NOT NULL CHECK (schedule_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'SEMESTER_END', 'ACADEMIC_YEAR_END')),
    target_emails TEXT[] NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    export_format VARCHAR(10) DEFAULT 'EXCEL' CHECK (export_format IN ('EXCEL', 'CSV', 'PDF')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_rep_freq ON public.scheduled_automatic_reports(schedule_frequency);
CREATE INDEX IF NOT EXISTS idx_sched_rep_status ON public.scheduled_automatic_reports(status);

-- ==============================================================================
-- 6. ENTERPRISE OPTIMIZED REPORTING SQL VIEWS
-- Read-only analytical views across the ERP modules
-- ==============================================================================

-- 6.1 v_report_student_complete_history
-- Aggregates Student profile, enrollment, total credits, computed CGPA, and backlog count
CREATE OR REPLACE VIEW public.v_report_student_complete_history AS
SELECT
    p.id AS student_id,
    p.full_name AS student_name,
    p.email AS student_email,
    p.department,
    p.semester,
    -- Inline CGPA: Sum(grade_points * subject_credits) / Sum(subject_credits)
    COALESCE(
        ROUND(
            (
                SELECT CASE WHEN SUM(sub2.credits) > 0
                            THEN SUM(sr2.grade_points * sub2.credits) / SUM(sub2.credits)
                            ELSE 0 END
                FROM public.student_results sr2
                JOIN public.subjects sub2 ON sub2.id = sr2.subject_id
                WHERE sr2.student_id = p.id
                  AND sr2.attempt_number = (
                        SELECT MAX(sr3.attempt_number)
                        FROM public.student_results sr3
                        WHERE sr3.student_id = sr2.student_id
                          AND sr3.subject_id = sr2.subject_id
                      )
            )::NUMERIC, 2
        ), 0.00
    ) AS current_cgpa,
    COALESCE(SUM(sr.credits_earned), 0) AS total_credits_earned,
    COALESCE(SUM(CASE WHEN sr.result_status != 'PASS' THEN sub.credits ELSE 0 END), 0) AS total_credits_pending,
    COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END) AS total_backlogs,
    MAX(sr.updated_at) AS last_activity_date
FROM public.profiles p
LEFT JOIN public.student_results sr ON p.id = sr.student_id
LEFT JOIN public.subjects sub ON sub.id = sr.subject_id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email, p.department, p.semester;

-- 6.2 v_report_course_popularity_and_enrollment
-- Aggregates course enrollment counts, capacity, pass %, and failure rate
CREATE OR REPLACE VIEW public.v_report_course_popularity_and_enrollment AS
SELECT
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.credits AS total_credits,
    COALESCE(s.lecture_hours, 0) AS lecture_hours,
    COALESCE(s.tutorial_hours, 0) AS tutorial_hours,
    COALESCE(s.practical_hours, 0) AS practical_hours,
    s.type AS subject_type,
    COALESCE(s.is_mandatory_non_credit, false) AS is_mandatory,
    COUNT(cr.id) AS total_registrations,
    COUNT(CASE WHEN cr.status = 'APPROVED' THEN 1 END) AS approved_enrollments,
    COUNT(CASE WHEN sr.result_status = 'PASS' THEN 1 END) AS passed_students,
    COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END) AS failed_students,
    ROUND(
        CASE
            WHEN COUNT(sr.id) > 0 THEN (COUNT(CASE WHEN sr.result_status = 'PASS' THEN 1 END)::NUMERIC / COUNT(sr.id)::NUMERIC) * 100.0
            ELSE 0.0
        END, 2
    ) AS pass_percentage,
    ROUND(
        CASE
            WHEN COUNT(sr.id) > 0 THEN (COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END)::NUMERIC / COUNT(sr.id)::NUMERIC) * 100.0
            ELSE 0.0
        END, 2
    ) AS failure_percentage
FROM public.subjects s
LEFT JOIN public.course_registrations cr ON s.id = cr.subject_id
LEFT JOIN public.student_results sr ON s.id = sr.subject_id
GROUP BY s.id, s.code, s.name, s.credits, s.lecture_hours, s.tutorial_hours, s.practical_hours, s.type, s.is_mandatory_non_credit;

-- 6.3 v_report_attendance_analytics
-- Aggregates student attendance percentage across sessions and flags defaulters (< 75%)
CREATE OR REPLACE VIEW public.v_report_attendance_analytics AS
SELECT
    p.id AS student_id,
    p.full_name AS student_name,
    p.email AS student_email,
    p.department,
    COUNT(ar.id) AS total_attendance_sessions,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent_count,
    ROUND(
        CASE
            WHEN COUNT(ar.id) > 0 THEN (COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / COUNT(ar.id)::NUMERIC) * 100.0
            ELSE 100.0
        END, 2
    ) AS attendance_percentage,
    CASE
        WHEN COUNT(ar.id) > 0 AND (COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / COUNT(ar.id)::NUMERIC) < 0.75 THEN 'DEFAULTER (< 75%)'
        ELSE 'COMPLIANT'
    END AS compliance_status
FROM public.profiles p
LEFT JOIN public.attendance_records ar ON p.id = ar.student_id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email, p.department;

-- 6.4 v_report_examination_analytics
-- Generates student rank list, merit list, fail list, and average SGPA/CGPA
CREATE OR REPLACE VIEW public.v_report_examination_analytics AS
WITH student_cgpa_calc AS (
    -- Compute CGPA per student using latest attempt per subject
    SELECT
        sr2.student_id,
        CASE WHEN SUM(sub2.credits) > 0
             THEN ROUND((SUM(sr2.grade_points * sub2.credits) / SUM(sub2.credits))::NUMERIC, 2)
             ELSE 0.00
        END AS computed_cgpa
    FROM public.student_results sr2
    JOIN public.subjects sub2 ON sub2.id = sr2.subject_id
    WHERE sr2.attempt_number = (
        SELECT MAX(sr3.attempt_number)
        FROM public.student_results sr3
        WHERE sr3.student_id = sr2.student_id
          AND sr3.subject_id = sr2.subject_id
    )
    GROUP BY sr2.student_id
)
SELECT
    p.id AS student_id,
    p.full_name AS student_name,
    p.department,
    p.semester,
    COALESCE(cg.computed_cgpa, 0.00) AS cgpa,
    COUNT(sr.id) AS total_subjects_attempted,
    COUNT(CASE WHEN sr.result_status = 'PASS' THEN 1 END) AS subjects_passed,
    COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END) AS subjects_failed,
    ROUND(AVG(COALESCE(sr.total_marks, 0)), 2) AS avg_total_marks,
    RANK() OVER (PARTITION BY p.department ORDER BY COALESCE(cg.computed_cgpa, 0.00) DESC) AS department_rank,
    CASE
        WHEN COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END) = 0
             AND COALESCE(cg.computed_cgpa, 0.00) >= 8.50 THEN 'MERIT_LIST'
        WHEN COUNT(CASE WHEN sr.result_status = 'FAIL' THEN 1 END) > 0 THEN 'FAIL_LIST'
        ELSE 'STANDARD_PASS'
    END AS examination_category
FROM public.profiles p
LEFT JOIN public.student_results sr ON p.id = sr.student_id
LEFT JOIN student_cgpa_calc cg ON cg.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.department, p.semester, cg.computed_cgpa;

-- 6.5 v_report_faculty_workload_summary
-- Summarizes faculty assigned subjects, classes, batches, and attendance sessions
CREATE OR REPLACE VIEW public.v_report_faculty_workload_summary AS
SELECT
    p.id AS faculty_id,
    p.full_name AS faculty_name,
    p.email AS faculty_email,
    p.department,
    COUNT(DISTINCT cfa.class_id) AS assigned_classes_count,
    COUNT(DISTINCT cfa.batch_id) AS assigned_batches_count,
    COUNT(DISTINCT cfa.subject_id) AS assigned_subjects_count,
    COUNT(DISTINCT asess.id) AS total_attendance_sessions_taken
FROM public.profiles p
LEFT JOIN public.class_faculty_allocations cfa ON p.id = cfa.faculty_id
LEFT JOIN public.attendance_sessions asess ON p.id = asess.faculty_id
WHERE p.role IN ('faculty', 'hod', 'dean')
GROUP BY p.id, p.full_name, p.email, p.department;

-- 6.6 v_report_class_batch_strength
-- Aggregates academic class and practical batch strength, capacity, and vacancies
CREATE OR REPLACE VIEW public.v_report_class_batch_strength AS
SELECT
    c.id AS class_id,
    c.program_name,
    c.academic_year,
    c.year_level,
    c.class_name,
    c.capacity AS class_capacity,
    COUNT(sba.id) AS enrolled_students,
    GREATEST(0, c.capacity - COUNT(sba.id)) AS vacant_seats,
    ROUND(
        CASE 
            WHEN c.capacity > 0 THEN (COUNT(sba.id)::NUMERIC / c.capacity::NUMERIC) * 100.0
            ELSE 0.0
        END, 2
    ) AS occupancy_percentage
FROM public.academic_classes c
LEFT JOIN public.student_batch_allocations sba ON c.id = sba.class_id AND sba.status = 'ACTIVE'
GROUP BY c.id, c.program_name, c.academic_year, c.year_level, c.class_name, c.capacity;

-- 6.7 v_report_admin_audit_summary
-- Summarizes administrative KPI metrics: admissions, registrations, graduations, backlogs
CREATE OR REPLACE VIEW public.v_report_admin_audit_summary AS
SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'student') AS total_admissions,
    (SELECT COUNT(*) FROM public.course_registrations WHERE status = 'APPROVED') AS total_registrations,
    (SELECT COUNT(DISTINCT student_id) FROM public.student_results WHERE result_status = 'FAIL') AS students_with_backlogs,
    (SELECT COUNT(*) FROM public.student_academic_timeline WHERE event_type = 'GRADUATION') AS total_graduations,
    (SELECT COUNT(*) FROM public.academic_classes WHERE status = 'ACTIVE') AS active_classes_count,
    (SELECT COUNT(*) FROM public.practical_batches WHERE status = 'ACTIVE') AS active_batches_count;

-- 6.8 v_report_credit_audit_summary
-- Summarizes student credit earn rate, deficit, and L-T-P distribution
CREATE OR REPLACE VIEW public.v_report_credit_audit_summary AS
SELECT
    p.id AS student_id,
    p.full_name AS student_name,
    p.department,
    COALESCE(SUM(sr.credits_earned), 0) AS total_credits_earned,
    COALESCE(SUM(CASE WHEN sr.result_status != 'PASS' THEN sub.credits ELSE 0 END), 0) AS total_credits_pending,
    GREATEST(0, 160 - COALESCE(SUM(sr.credits_earned), 0)) AS credit_deficit_to_graduation,
    CASE
        WHEN COALESCE(SUM(sr.credits_earned), 0) >= 160 THEN 'GRADUATION_ELIGIBLE'
        WHEN COALESCE(SUM(sr.credits_earned), 0) >= 120 THEN 'SENIOR_STANDING'
        WHEN COALESCE(SUM(sr.credits_earned), 0) >= 60 THEN 'INTERMEDIATE_STANDING'
        ELSE 'JUNIOR_STANDING'
    END AS academic_credit_standing
FROM public.profiles p
LEFT JOIN public.student_results sr ON p.id = sr.student_id
LEFT JOIN public.subjects sub ON sub.id = sr.subject_id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.department;

-- ==============================================================================
-- 7. SEED INITIAL ENTERPRISE REPORT CATALOG
-- Seeds 50+ TCS iON / PeopleSoft / SAP Campus Management style report definitions
-- ==============================================================================
INSERT INTO public.report_definitions_catalog (report_code, category, report_name, description, allowed_roles)
VALUES
-- STUDENT REPORTS (20)
('STUDENT_PROFILE', 'STUDENT', 'Student Profile Report', 'Complete personal, departmental, and contact profile of students', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_COMPLETE_ACADEMIC_HISTORY', 'STUDENT', 'Complete Academic History', 'Granular academic progression, CGPA, credits, and attempt history', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_SEMESTER_HISTORY', 'STUDENT', 'Semester History Report', 'Term-by-term SGPA and semester promotion records', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_SUBJECT_HISTORY', 'STUDENT', 'Subject History Report', 'Enrollment, grades, and completion records by subject', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_REGISTRATION_HISTORY', 'STUDENT', 'Registration History Report', 'Course registration window history and approval audit logs', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_ATTENDANCE_HISTORY', 'STUDENT', 'Attendance History Report', 'Detailed session presence and absence records', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_MARKS_HISTORY', 'STUDENT', 'Marks History Report', 'Granular internal and external exam marks breakdown', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_INTERNAL_ASSESSMENT_HISTORY', 'STUDENT', 'Internal Assessment History', 'Continuous internal evaluation and quiz scores', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_PRACTICAL_PERFORMANCE', 'STUDENT', 'Practical Performance Report', 'Lab batch attendance and practical examination scores', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_BACKLOG_HISTORY', 'STUDENT', 'Backlog History Report', 'Active and cleared backlogs with attempt counts', '{"admin","dean","hod","faculty"}'),
('STUDENT_PROMOTION_HISTORY', 'STUDENT', 'Promotion History Report', 'Year and semester promotion audit trail', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_CREDIT_HISTORY', 'STUDENT', 'Credit History Report', 'Earned, pending, and carry-forward credits breakdown', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_SGPA_HISTORY', 'STUDENT', 'SGPA History Report', 'Semester Grade Point Average trend across all terms', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_CGPA_HISTORY', 'STUDENT', 'CGPA History Report', 'Cumulative Grade Point Average progression', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_TRANSCRIPT', 'STUDENT', 'Academic Transcript Report', 'Official institutional academic transcript summary', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_GRADUATION_PROGRESS', 'STUDENT', 'Graduation Progress Report', 'Credit audit against institutional graduation threshold (160 credits)', '{"admin","dean","hod","faculty","student"}'),
('STUDENT_DISCIPLINARY_RECORDS', 'STUDENT', 'Disciplinary Records Report', 'Academic rule violations and administrative warnings', '{"admin","dean","hod"}'),
('STUDENT_CERTIFICATES', 'STUDENT', 'Certificates Issued Report', 'Bonafide, LOR, and graduation certificate issuance log', '{"admin","dean","hod","student"}'),
('STUDENT_LOGIN_HISTORY', 'STUDENT', 'Student Login History Report', 'ERP portal access timestamps and device audit log', '{"admin","dean","hod"}'),
('STUDENT_ACTIVITY_TIMELINE', 'STUDENT', 'Student Activity Timeline Report', 'Permanent chronological academic audit timeline', '{"admin","dean","hod","faculty","student"}'),

-- COURSE REPORTS (9)
('COURSE_REGISTRATION', 'COURSE', 'Course Registration Summary', 'Total approved, pending, and rejected registrations per course', '{"admin","dean","hod","faculty"}'),
('COURSE_COMPLETION', 'COURSE', 'Course Completion Report', 'Percentage of students successfully completing assigned courses', '{"admin","dean","hod","faculty"}'),
('COURSE_POPULARITY', 'COURSE', 'Course Popularity Index', 'Ranked elective and core subject enrollment popularity', '{"admin","dean","hod","faculty"}'),
('SUBJECT_WISE_ENROLLMENT', 'COURSE', 'Subject-Wise Enrollment Report', 'Granular student list enrolled in each subject code', '{"admin","dean","hod","faculty"}'),
('ELECTIVE_SELECTION', 'COURSE', 'Elective Selection Distribution', 'Breakdown of professional and open elective selections', '{"admin","dean","hod","faculty"}'),
('COURSE_CAPACITY', 'COURSE', 'Course Capacity & Vacancy Report', 'Seat utilization and available vacancies across courses', '{"admin","dean","hod"}'),
('COURSE_SUCCESS_RATE', 'COURSE', 'Course Success Rate Report', 'Pass percentage by subject code across exam sessions', '{"admin","dean","hod","faculty"}'),
('COURSE_FAILURE_RATE', 'COURSE', 'Course Failure Rate Report', 'Failure percentage and repeat registration statistics', '{"admin","dean","hod","faculty"}'),
('COURSE_CREDIT_DISTRIBUTION', 'COURSE', 'Course Credit Distribution Report', 'L-T-P credit hours breakdown per subject', '{"admin","dean","hod","faculty"}'),

-- ATTENDANCE REPORTS (11)
('ATTENDANCE_DAILY', 'ATTENDANCE', 'Daily Attendance Report', 'Daily present and absent summary across classes', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_WEEKLY', 'ATTENDANCE', 'Weekly Attendance Summary', 'Week-wise attendance aggregation and trend', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_MONTHLY', 'ATTENDANCE', 'Monthly Attendance Report', 'Monthly attendance percentage by student and class', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_SEMESTER', 'ATTENDANCE', 'Semester Attendance Audit', 'Full semester attendance compliance against 75% threshold', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_YEARLY', 'ATTENDANCE', 'Yearly Attendance Audit', 'Academic year attendance summary', '{"admin","dean","hod"}'),
('ATTENDANCE_SUBJECT_WISE', 'ATTENDANCE', 'Subject-Wise Attendance Report', 'Attendance percentage grouped by subject code', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_FACULTY_WISE', 'ATTENDANCE', 'Faculty-Wise Attendance Report', 'Attendance recording compliance by faculty member', '{"admin","dean","hod"}'),
('ATTENDANCE_CLASS_WISE', 'ATTENDANCE', 'Class-Wise Attendance Report', 'Overall class attendance comparison (e.g. FY-1 vs SY-1)', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_BATCH_WISE', 'ATTENDANCE', 'Batch-Wise Attendance Report', 'Practical lab batch attendance comparison', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_LOW_STUDENTS', 'ATTENDANCE', 'Low Attendance Students Report', 'Students with attendance between 65% and 75%', '{"admin","dean","hod","faculty"}'),
('ATTENDANCE_DEFAULTERS', 'ATTENDANCE', 'Attendance Defaulters Report', 'Students below 75% mandatory attendance threshold', '{"admin","dean","hod","faculty"}'),

-- EXAMINATION REPORTS (11)
('EXAM_INTERNAL_MARKS', 'EXAMINATION', 'Internal Marks Report', 'Mid-semester and quiz internal evaluation scores', '{"admin","dean","hod","faculty"}'),
('EXAM_EXTERNAL_MARKS', 'EXAMINATION', 'External Marks Report', 'End-semester university examination marks', '{"admin","dean","hod","faculty"}'),
('EXAM_PRACTICAL_MARKS', 'EXAMINATION', 'Practical Examination Marks', 'Laboratory and oral examination scores', '{"admin","dean","hod","faculty"}'),
('EXAM_SEMESTER_RESULTS', 'EXAMINATION', 'Semester Results Ledger', 'Complete result ledger with grades and SGPA', '{"admin","dean","hod","faculty"}'),
('EXAM_RANK_LIST', 'EXAMINATION', 'Departmental Rank List', 'Ranked list of students by CGPA within department', '{"admin","dean","hod"}'),
('EXAM_MERIT_LIST', 'EXAMINATION', 'Academic Merit List (CGPA >= 8.5)', 'Honors and merit scholarship eligible students', '{"admin","dean","hod"}'),
('EXAM_FAIL_LIST', 'EXAMINATION', 'Examination Fail List', 'Students with backlogs requiring remedial action', '{"admin","dean","hod","faculty"}'),
('EXAM_PASS_PERCENTAGE', 'EXAMINATION', 'Pass Percentage Analysis', 'Departmental and subject-wise pass percentage KPIs', '{"admin","dean","hod","faculty"}'),
('EXAM_SUBJECT_ANALYSIS', 'EXAMINATION', 'Subject Examination Analysis', 'Average mark, high/low score, and standard deviation per subject', '{"admin","dean","hod","faculty"}'),
('EXAM_STATISTICS', 'EXAMINATION', 'Comprehensive Exam Statistics', 'Total appeared, passed, failed, and distinction count', '{"admin","dean","hod"}'),
('EXAM_RESULT_TRENDS', 'EXAMINATION', 'Result Trend Analysis', 'Multi-year and multi-semester SGPA/CGPA progression', '{"admin","dean","hod"}'),

-- FACULTY REPORTS (8)
('FACULTY_WORKLOAD', 'FACULTY', 'Faculty Workload Report', 'Total lecture, tutorial, and practical hours assigned per week', '{"admin","dean","hod"}'),
('FACULTY_SUBJECTS_ASSIGNED', 'FACULTY', 'Assigned Subjects Report', 'Subject allocation matrix by faculty member', '{"admin","dean","hod","faculty"}'),
('FACULTY_CLASSES_ASSIGNED', 'FACULTY', 'Assigned Classes Report', 'Theory class teacher and coordinator allocations', '{"admin","dean","hod","faculty"}'),
('FACULTY_BATCH_ASSIGNMENTS', 'FACULTY', 'Batch Assignments Report', 'Practical lab batch faculty allocations', '{"admin","dean","hod","faculty"}'),
('FACULTY_ATTENDANCE_TAKEN', 'FACULTY', 'Attendance Recording Audit', 'Count and regularity of attendance sessions logged by faculty', '{"admin","dean","hod"}'),
('FACULTY_MARKS_SUBMITTED', 'FACULTY', 'Marks Submission Compliance', 'Status of internal/external marks entry by faculty', '{"admin","dean","hod"}'),
('FACULTY_STUDENT_FEEDBACK', 'FACULTY', 'Student Feedback Analytics', 'Aggregated student course feedback ratings per faculty', '{"admin","dean","hod"}'),
('FACULTY_PERFORMANCE', 'FACULTY', 'Faculty Performance Matrix', 'Holistic appraisal combining teaching, research, and compliance', '{"admin","dean","hod"}'),

-- CLASS & BATCH REPORTS (7)
('CLASS_STRENGTH', 'CLASS_BATCH', 'Class Strength & Vacancy Report', 'Enrolled vs capacity statistics across academic classes', '{"admin","dean","hod","faculty"}'),
('BATCH_STRENGTH', 'CLASS_BATCH', 'Batch Strength Report', 'Practical section seat utilization and occupancy %', '{"admin","dean","hod","faculty"}'),
('CLASS_CAPACITY', 'CLASS_BATCH', 'Class Capacity Audit', 'Classroom seat limits and overflow prevention audit', '{"admin","dean","hod"}'),
('BATCH_CAPACITY', 'CLASS_BATCH', 'Batch Capacity Audit', 'Lab seat capacity and section balancing audit', '{"admin","dean","hod"}'),
('STUDENT_ALLOCATION', 'CLASS_BATCH', 'Student Allocation Roster', '100% ONE Class & ONE Batch student assignment audit', '{"admin","dean","hod","faculty"}'),
('FACULTY_ALLOCATION', 'CLASS_BATCH', 'Faculty Allocation Roster', 'Theory vs Practical teaching assignments across classes', '{"admin","dean","hod","faculty"}'),
('TRANSFER_HISTORY', 'CLASS_BATCH', 'Student Transfer Audit Log', 'Immutable history of class and practical batch transfers', '{"admin","dean","hod"}'),

-- ADMIN REPORTS (10)
('ADMIN_ADMISSIONS', 'ADMIN', 'Admissions Summary Report', 'Yearly admission counts grouped by program and department', '{"admin","dean","hod"}'),
('ADMIN_REGISTRATIONS', 'ADMIN', 'Registration Processing Report', 'Semester and course registration window compliance', '{"admin","dean","hod"}'),
('ADMIN_PROMOTIONS', 'ADMIN', 'Academic Promotions Audit', 'Students promoted, detained, or placed on probation', '{"admin","dean","hod"}'),
('ADMIN_GRADUATIONS', 'ADMIN', 'Graduation Processing Report', 'Students completing 160 credits and awarded degrees', '{"admin","dean","hod"}'),
('ADMIN_BACKLOGS', 'ADMIN', 'Institutional Backlog Summary', 'Departmental backlog counts and repeat exam statistics', '{"admin","dean","hod"}'),
('ADMIN_DROPOUTS', 'ADMIN', 'Dropout & Withdrawal Report', 'Student attrition and withdrawal reason tracking', '{"admin","dean","hod"}'),
('ADMIN_SUSPENSIONS', 'ADMIN', 'Suspensions & Disciplinary Report', 'Active administrative suspensions and rule penalties', '{"admin","dean","hod"}'),
('ADMIN_RULE_VIOLATIONS', 'ADMIN', 'Academic Rule Violations Log', 'Credit ceiling overflow, attendance default, or prereq bypass attempts', '{"admin","dean","hod"}'),
('ADMIN_NOTIFICATIONS_SENT', 'ADMIN', 'System Notification Audit', 'Automated email, SMS, and portal notifications broadcasted', '{"admin","dean","hod"}'),
('ADMIN_AUDIT_LOGS', 'ADMIN', 'Enterprise System Audit Log', 'User login, CRUD actions, and sensitive data access audit', '{"admin","dean","hod"}'),

-- CREDIT REPORTS (8)
('CREDIT_SUMMARY', 'CREDIT', 'Institutional Credit Summary', 'Overall credit distribution across departments and semesters', '{"admin","dean","hod","faculty","student"}'),
('CREDIT_EARNED', 'CREDIT', 'Earned Credits Report', 'Students categorized by earned credit milestones', '{"admin","dean","hod","faculty","student"}'),
('CREDIT_PENDING', 'CREDIT', 'Pending Credits Report', 'Students with pending credits due to backlogs or ongoing courses', '{"admin","dean","hod","faculty","student"}'),
('CREDIT_DEFICIT', 'CREDIT', 'Credit Deficit Report', 'Students lagging behind graduation credit pace (160 total)', '{"admin","dean","hod","faculty"}'),
('CREDIT_GRADUATION', 'CREDIT', 'Graduation Credits Verification', 'Final credit audit for graduating seniors', '{"admin","dean","hod"}'),
('CREDIT_ELECTIVES', 'CREDIT', 'Elective Credits Breakdown', 'Professional and open elective credits earned per student', '{"admin","dean","hod","faculty","student"}'),
('CREDIT_MINOR', 'CREDIT', 'Minor Degree Credits Report', 'Credits earned toward academic minor specializations', '{"admin","dean","hod","faculty","student"}'),
('CREDIT_HONOURS', 'CREDIT', 'Honours Degree Credits Report', 'Advanced credits earned toward Honours degree designation', '{"admin","dean","hod","faculty","student"}')
ON CONFLICT (report_code) DO NOTHING;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY & PERMISSIONS
-- ==============================================================================
ALTER TABLE public.student_academic_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_definitions_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_automatic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read report catalog" ON public.report_definitions_catalog FOR SELECT USING (true);

CREATE POLICY "Users access own saved reports" ON public.user_saved_reports FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);

CREATE POLICY "Users view own history" ON public.report_generation_history FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);

CREATE POLICY "Students view own timeline" ON public.student_academic_timeline FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod', 'faculty'))
);

CREATE POLICY "Admin full access timeline" ON public.student_academic_timeline FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);

CREATE POLICY "Admin full access scheduled reports" ON public.scheduled_automatic_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);

-- ==============================================================================
-- PHASE 7 ENTERPRISE REPORTING & ANALYTICS SCHEMA COMPLETE
-- ==============================================================================
