-- ==============================================================================
-- PHASE 8: ENTERPRISE BULK DATA MANAGEMENT SYSTEM
-- TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
-- ==============================================================================
-- Additive schema: Creates permanent audit logs, row-level import error tables,
-- and configurable import/export template catalogs for all 9 ERP modules.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. BULK DATA OPERATIONS AUDIT TABLE
-- Tracks every Import, Export, Bulk Update, Bulk Delete, and Bulk Assignment
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bulk_data_operations_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('IMPORT', 'EXPORT', 'BULK_UPDATE', 'BULK_DELETE', 'BULK_ASSIGNMENT')),
    module_name VARCHAR(100) NOT NULL, -- e.g., STUDENT, FACULTY, COURSE, CLASS_BATCH, REGISTRATION, ATTENDANCE, EXAMINATION, CREDIT, REPORTING
    entity_type VARCHAR(100) NOT NULL, -- e.g., students, faculty, courses, marks, registrations
    file_format VARCHAR(20) NOT NULL,  -- CSV, XLSX, JSON, PDF
    total_records INT DEFAULT 0,
    success_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'VALIDATED_ONLY')),
    ip_address VARCHAR(100) DEFAULT '127.0.0.1',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_audit_user ON public.bulk_data_operations_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_audit_module ON public.bulk_data_operations_audit(module_name);
CREATE INDEX IF NOT EXISTS idx_bulk_audit_op ON public.bulk_data_operations_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_audit_date ON public.bulk_data_operations_audit(created_at);

-- ==============================================================================
-- 2. BULK IMPORT ERRORS LOG TABLE
-- Stores detailed row-level failure reasons, field names, and highlighted data
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bulk_import_errors_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.bulk_data_operations_audit(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    field_name VARCHAR(100),
    error_message TEXT NOT NULL,
    raw_row_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_errors_audit ON public.bulk_import_errors_log(audit_id);
CREATE INDEX IF NOT EXISTS idx_bulk_errors_row ON public.bulk_import_errors_log(row_number);

-- ==============================================================================
-- 3. BULK IMPORT TEMPLATES CATALOG
-- Stores configurable columns, required flags, validation rules, and sample data
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bulk_import_templates_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    template_name VARCHAR(150) NOT NULL,
    description TEXT,
    columns JSONB NOT NULL,
    sample_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_template_module_entity UNIQUE(module_name, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_bulk_templates_module ON public.bulk_import_templates_catalog(module_name);

-- ==============================================================================
-- 4. SEED ENTERPRISE TEMPLATES FOR ALL 9 CORE ERP MODULES
-- ==============================================================================
INSERT INTO public.bulk_import_templates_catalog (
    module_name, entity_type, template_name, description, columns, sample_data
) VALUES 
(
    'STUDENT',
    'students',
    'Enterprise Student Master Template',
    'Template for bulk enrolling new students, updating student records, and setting academic history.',
    '[
        {"name": "email", "description": "Student Email Address", "type": "string", "required": true, "validation_rule": "Valid email, unique in system"},
        {"name": "full_name", "description": "Student Full Name", "type": "string", "required": true, "validation_rule": "Min 3 characters"},
        {"name": "enrollment_no", "description": "University Enrollment Number", "type": "string", "required": true, "validation_rule": "Alphanumeric, unique"},
        {"name": "department", "description": "Academic Department Name", "type": "string", "required": true, "validation_rule": "Must match active department"},
        {"name": "semester", "description": "Current Semester Level", "type": "number", "required": true, "validation_rule": "Integer between 1 and 8"}
    ]'::jsonb,
    '[
        {"email": "student1@mit-learn.edu", "full_name": "Aarav Sharma", "enrollment_no": "MIT2026001", "department": "Computer Science Engineering", "semester": 1},
        {"email": "student2@mit-learn.edu", "full_name": "Ananya Patel", "enrollment_no": "MIT2026002", "department": "Computer Science Engineering", "semester": 1}
    ]'::jsonb
),
(
    'FACULTY',
    'faculty',
    'Enterprise Faculty Master Template',
    'Template for onboarding faculty members, assigning departments, and allocating workload.',
    '[
        {"name": "email", "description": "Faculty Email Address", "type": "string", "required": true, "validation_rule": "Valid email, unique"},
        {"name": "full_name", "description": "Faculty Full Name", "type": "string", "required": true, "validation_rule": "Min 3 characters"},
        {"name": "department", "description": "Academic Department Name", "type": "string", "required": true, "validation_rule": "Must match active department"},
        {"name": "role", "description": "System Role", "type": "string", "required": true, "validation_rule": "faculty, hod, or dean"}
    ]'::jsonb,
    '[
        {"email": "dr.kulkarni@mit-learn.edu", "full_name": "Dr. Ramesh Kulkarni", "department": "Computer Science Engineering", "role": "faculty"},
        {"email": "prof.deshmukh@mit-learn.edu", "full_name": "Prof. Sneha Deshmukh", "department": "Information Technology", "role": "faculty"}
    ]'::jsonb
),
(
    'COURSE',
    'subjects',
    'Enterprise Course & Subject Catalog Template',
    'Template for importing curriculum subjects, credits, and contact hours.',
    '[
        {"name": "code", "description": "Unique Subject Code", "type": "string", "required": true, "validation_rule": "Alphanumeric code, e.g. CS101"},
        {"name": "name", "description": "Subject Title", "type": "string", "required": true, "validation_rule": "Course name string"},
        {"name": "credits", "description": "Total Credit Points", "type": "number", "required": true, "validation_rule": "Numeric > 0"},
        {"name": "type", "description": "Course Category Type", "type": "string", "required": true, "validation_rule": "Theory, Practical, or Audit"},
        {"name": "lecture_hours", "description": "Lecture Contact Hours (L)", "type": "number", "required": true, "validation_rule": "Integer >= 0"},
        {"name": "tutorial_hours", "description": "Tutorial Contact Hours (T)", "type": "number", "required": true, "validation_rule": "Integer >= 0"},
        {"name": "practical_hours", "description": "Practical Contact Hours (P)", "type": "number", "required": true, "validation_rule": "Integer >= 0"}
    ]'::jsonb,
    '[
        {"code": "CS101", "name": "Data Structures and Algorithms", "credits": 4.0, "type": "Theory", "lecture_hours": 3, "tutorial_hours": 1, "practical_hours": 0},
        {"code": "CS102", "name": "Database Management Systems Lab", "credits": 2.0, "type": "Practical", "lecture_hours": 0, "tutorial_hours": 0, "practical_hours": 4}
    ]'::jsonb
),
(
    'CLASS_BATCH',
    'classes',
    'Enterprise Academic Classes Template',
    'Template for bulk generating academic classes across programs and years.',
    '[
        {"name": "class_name", "description": "Class Identifier", "type": "string", "required": true, "validation_rule": "Unique class label, e.g. FY-1"},
        {"name": "year_level", "description": "Academic Year Name", "type": "string", "required": true, "validation_rule": "First Year, Second Year, Third Year, or Final Year"},
        {"name": "program", "description": "Degree Program", "type": "string", "required": true, "validation_rule": "B.Tech Computer Science"},
        {"name": "capacity", "description": "Max Student Capacity", "type": "number", "required": true, "validation_rule": "Integer between 20 and 150"}
    ]'::jsonb,
    '[
        {"class_name": "FY-1", "year_level": "First Year", "program": "B.Tech Computer Science", "capacity": 70},
        {"class_name": "FY-2", "year_level": "First Year", "program": "B.Tech Computer Science", "capacity": 72}
    ]'::jsonb
),
(
    'CLASS_BATCH',
    'batches',
    'Enterprise Practical Batches Template',
    'Template for bulk creating practical lab batches within parent classes.',
    '[
        {"name": "batch_name", "description": "Batch Letter/Label", "type": "string", "required": true, "validation_rule": "Batch A, Batch B, Batch C"},
        {"name": "class_name", "description": "Parent Class Name", "type": "string", "required": true, "validation_rule": "Must match active class_name"},
        {"name": "capacity", "description": "Max Batch Capacity", "type": "number", "required": true, "validation_rule": "Integer between 10 and 30"},
        {"name": "assigned_lab", "description": "Lab Room Code", "type": "string", "required": true, "validation_rule": "Room string, e.g. Lab 101"}
    ]'::jsonb,
    '[
        {"batch_name": "Batch A", "class_name": "FY-1", "capacity": 24, "assigned_lab": "Lab 101"},
        {"batch_name": "Batch B", "class_name": "FY-1", "capacity": 24, "assigned_lab": "Lab 102"}
    ]'::jsonb
),
(
    'REGISTRATION',
    'registrations',
    'Enterprise Course Registration Template',
    'Template for bulk student course enrollment and credit registration.',
    '[
        {"name": "student_email", "description": "Student Email Address", "type": "string", "required": true, "validation_rule": "Must match active student"},
        {"name": "subject_code", "description": "Subject Code", "type": "string", "required": true, "validation_rule": "Must match active subject"},
        {"name": "academic_year", "description": "Academic Session Year", "type": "string", "required": true, "validation_rule": "e.g. 2026-2027"},
        {"name": "semester", "description": "Semester Number", "type": "number", "required": true, "validation_rule": "Integer 1-8"}
    ]'::jsonb,
    '[
        {"student_email": "student1@mit-learn.edu", "subject_code": "CS101", "academic_year": "2026-2027", "semester": 1},
        {"student_email": "student2@mit-learn.edu", "subject_code": "CS101", "academic_year": "2026-2027", "semester": 1}
    ]'::jsonb
),
(
    'ATTENDANCE',
    'attendance',
    'Enterprise Attendance Import Template',
    'Template for bulk attendance recording across lecture and lab sessions.',
    '[
        {"name": "student_email", "description": "Student Email Address", "type": "string", "required": true, "validation_rule": "Must match active student"},
        {"name": "subject_code", "description": "Subject Code", "type": "string", "required": true, "validation_rule": "Must match active subject"},
        {"name": "status", "description": "Attendance Status", "type": "string", "required": true, "validation_rule": "present, absent, late, or excused"},
        {"name": "date", "description": "Session Date", "type": "string", "required": true, "validation_rule": "YYYY-MM-DD"}
    ]'::jsonb,
    '[
        {"student_email": "student1@mit-learn.edu", "subject_code": "CS101", "status": "present", "date": "2026-07-26"},
        {"student_email": "student2@mit-learn.edu", "subject_code": "CS101", "status": "absent", "date": "2026-07-26"}
    ]'::jsonb
),
(
    'EXAMINATION',
    'marks',
    'Enterprise Exam Marks & Results Template',
    'Template for bulk uploading internal assessments, practical marks, and semester end results.',
    '[
        {"name": "student_email", "description": "Student Email Address", "type": "string", "required": true, "validation_rule": "Must match active student"},
        {"name": "subject_code", "description": "Subject Code", "type": "string", "required": true, "validation_rule": "Must match active subject"},
        {"name": "internal_marks", "description": "Internal Assessment (0-40)", "type": "number", "required": true, "validation_rule": "Integer 0-40"},
        {"name": "external_marks", "description": "Semester End Exam (0-60)", "type": "number", "required": true, "validation_rule": "Integer 0-60"},
        {"name": "result_status", "description": "Pass or Fail Result", "type": "string", "required": true, "validation_rule": "PASS or FAIL"}
    ]'::jsonb,
    '[
        {"student_email": "student1@mit-learn.edu", "subject_code": "CS101", "internal_marks": 35, "external_marks": 52, "result_status": "PASS"},
        {"student_email": "student2@mit-learn.edu", "subject_code": "CS101", "internal_marks": 28, "external_marks": 45, "result_status": "PASS"}
    ]'::jsonb
),
(
    'CREDIT',
    'credit_rules',
    'Enterprise Credit Rules Template',
    'Template for configuring minimum/maximum credits and graduation thresholds.',
    '[
        {"name": "department", "description": "Academic Department", "type": "string", "required": true, "validation_rule": "Department name string"},
        {"name": "min_semester_credits", "description": "Minimum Credits per Semester", "type": "number", "required": true, "validation_rule": "Numeric > 0"},
        {"name": "max_semester_credits", "description": "Maximum Credits per Semester", "type": "number", "required": true, "validation_rule": "Numeric <= 32"},
        {"name": "total_graduation_credits", "description": "Total Required for Degree", "type": "number", "required": true, "validation_rule": "Numeric >= 160"}
    ]'::jsonb,
    '[
        {"department": "Computer Science Engineering", "min_semester_credits": 16.0, "max_semester_credits": 28.0, "total_graduation_credits": 168.0},
        {"department": "Information Technology", "min_semester_credits": 16.0, "max_semester_credits": 28.0, "total_graduation_credits": 168.0}
    ]'::jsonb
)
ON CONFLICT (module_name, entity_type) DO NOTHING;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ==============================================================================
ALTER TABLE public.bulk_data_operations_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_errors_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_templates_catalog ENABLE ROW LEVEL SECURITY;

-- Public read access to templates catalog
CREATE POLICY "Public read templates catalog" ON public.bulk_import_templates_catalog
    FOR SELECT USING (true);

-- Admin and Faculty view access to audit log
CREATE POLICY "View bulk operations audit" ON public.bulk_data_operations_audit
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod', 'faculty'))
    );

-- Admin full access to audit log and errors
CREATE POLICY "Admin full access bulk audit" ON public.bulk_data_operations_audit
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
    );

CREATE POLICY "View bulk error log" ON public.bulk_import_errors_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod', 'faculty'))
    );

CREATE POLICY "Admin full access bulk error log" ON public.bulk_import_errors_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
    );

-- ==============================================================================
-- PHASE 8 ENTERPRISE BULK DATA MANAGEMENT SCHEMA COMPLETE
-- ==============================================================================
