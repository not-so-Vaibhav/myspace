-- ==============================================================================
-- PHASE 6: ENTERPRISE CLASS & PRACTICAL BATCH MANAGEMENT SYSTEM
-- TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Style
-- ==============================================================================
-- Implements Academic Class Hierarchy (Program -> Academic Year -> Year -> Class -> Batches)
-- Configurable automatic batch generation, student & faculty allocation,
-- transfer audit logs, timetable & attendance integration, and reporting views.
--
-- CORE MANDATE: NON-BREAKING ADDITIONS ONLY (NO MODIFICATION OR DROP OF EXISTING TABLES)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ACADEMIC CLASSES TABLE
-- Hierarchy: Program -> Academic Year -> Year Level -> Class (e.g. FY-1, FY-2)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_name VARCHAR(100) NOT NULL DEFAULT 'Computer Science Engineering',
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    year_level VARCHAR(30) NOT NULL DEFAULT 'First Year', -- First Year, Second Year, etc.
    class_name VARCHAR(50) NOT NULL,                      -- FY-1, FY-2, SY-1, etc.
    capacity INT NOT NULL DEFAULT 70 CHECK (capacity >= 0),
    class_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    classroom VARCHAR(50) DEFAULT 'Room 101',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_program_year_class UNIQUE (program_name, academic_year, class_name)
);

CREATE INDEX IF NOT EXISTS idx_acad_classes_program ON public.academic_classes(program_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_acad_classes_teacher ON public.academic_classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_acad_classes_status ON public.academic_classes(status);

-- ==============================================================================
-- 2. PRACTICAL BATCHES TABLE
-- Hierarchy: Class -> Practical Batches (e.g. Batch A, Batch B, Batch C)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.practical_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    batch_name VARCHAR(50) NOT NULL,                      -- Batch A, Batch B, Batch C
    capacity INT NOT NULL DEFAULT 24 CHECK (capacity >= 0),
    assigned_lab VARCHAR(100) DEFAULT 'Computer Lab 1',
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_batch_name UNIQUE (class_id, batch_name)
);

CREATE INDEX IF NOT EXISTS idx_prac_batches_class ON public.practical_batches(class_id);
CREATE INDEX IF NOT EXISTS idx_prac_batches_faculty ON public.practical_batches(faculty_id);
CREATE INDEX IF NOT EXISTS idx_prac_batches_status ON public.practical_batches(status);

-- ==============================================================================
-- 3. STUDENT BATCH ALLOCATIONS TABLE
-- Links each student to ONE Class and ONE Practical Batch.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_batch_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.practical_batches(id) ON DELETE RESTRICT,
    allocated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRANSFERRED', 'INACTIVE')),
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a student can only have ONE ACTIVE class & batch allocation at any given time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_student_allocation
    ON public.student_batch_allocations(student_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_stud_batch_alloc_class ON public.student_batch_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_stud_batch_alloc_batch ON public.student_batch_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_stud_batch_alloc_student ON public.student_batch_allocations(student_id);

-- ==============================================================================
-- 4. CLASS & BATCH FACULTY ALLOCATIONS TABLE
-- Assigns Faculty to Entire Class (Theory) or Specific Batch (Practical)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.class_faculty_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.practical_batches(id) ON DELETE CASCADE, -- NULL when THEORY for whole class
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name VARCHAR(100) DEFAULT 'General Subject',
    allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('THEORY', 'PRACTICAL')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_class_batch_subj
    ON public.class_faculty_allocations(
        faculty_id,
        class_id,
        COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

CREATE INDEX IF NOT EXISTS idx_class_fac_alloc_class ON public.class_faculty_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_class_fac_alloc_batch ON public.class_faculty_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_class_fac_alloc_faculty ON public.class_faculty_allocations(faculty_id);

-- ==============================================================================
-- 5. ACADEMIC TIMETABLES TABLE
-- Unified timetable for Theory (Whole Class) and Practical Labs (Selected Batch)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.practical_batches(id) ON DELETE CASCADE, -- NULL for THEORY
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name VARCHAR(100) NOT NULL,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_time VARCHAR(10) NOT NULL, -- '09:00'
    end_time VARCHAR(10) NOT NULL,   -- '10:00'
    room_or_lab VARCHAR(100) DEFAULT 'Room 101',
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('THEORY', 'PRACTICAL')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_class ON public.academic_timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_batch ON public.academic_timetables(batch_id);

-- ==============================================================================
-- 6. BATCH & CLASS TRANSFER AUDIT LOGS
-- Immutable log of all student transfers between classes or practical batches
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.batch_transfer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('BATCH_TRANSFER', 'CLASS_TRANSFER')),
    from_class_id UUID REFERENCES public.academic_classes(id) ON DELETE SET NULL,
    to_class_id UUID REFERENCES public.academic_classes(id) ON DELETE SET NULL,
    from_batch_id UUID REFERENCES public.practical_batches(id) ON DELETE SET NULL,
    to_batch_id UUID REFERENCES public.practical_batches(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL DEFAULT 'Administrative Transfer',
    transferred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_transfer_student ON public.batch_transfer_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_batch_transfer_date ON public.batch_transfer_logs(transferred_at);

-- ==============================================================================
-- 7. ENTERPRISE REPORTING VIEWS
-- ==============================================================================

-- 7.1 Class Strength & Vacancy Summary
CREATE OR REPLACE VIEW public.v_class_strength_summary AS
SELECT
    c.id AS class_id,
    c.program_name,
    c.academic_year,
    c.year_level,
    c.class_name,
    c.capacity AS class_capacity,
    c.classroom,
    c.status,
    COALESCE(p_teacher.full_name, 'Unassigned') AS class_teacher_name,
    COALESCE(p_coord.full_name, 'Unassigned') AS coordinator_name,
    COUNT(sba.id) AS enrolled_students,
    GREATEST(0, c.capacity - COUNT(sba.id)) AS vacancy,
    ROUND(
        CASE 
            WHEN c.capacity > 0 THEN (COUNT(sba.id)::NUMERIC / c.capacity::NUMERIC) * 100.0
            ELSE 0.0
        END, 2
    ) AS occupancy_percentage
FROM public.academic_classes c
LEFT JOIN public.profiles p_teacher ON c.class_teacher_id = p_teacher.id
LEFT JOIN public.profiles p_coord ON c.coordinator_id = p_coord.id
LEFT JOIN public.student_batch_allocations sba ON c.id = sba.class_id AND sba.status = 'ACTIVE'
GROUP BY c.id, c.program_name, c.academic_year, c.year_level, c.class_name, c.capacity, c.classroom, c.status, p_teacher.full_name, p_coord.full_name;

-- 7.2 Practical Batch Strength & Vacancy Report
CREATE OR REPLACE VIEW public.v_batch_capacity_report AS
SELECT
    b.id AS batch_id,
    b.batch_name,
    c.id AS class_id,
    c.class_name AS parent_class_name,
    c.program_name,
    c.year_level,
    b.capacity AS batch_capacity,
    b.assigned_lab,
    b.status,
    COALESCE(p_fac.full_name, 'Unassigned') AS faculty_name,
    COUNT(sba.id) AS enrolled_students,
    GREATEST(0, b.capacity - COUNT(sba.id)) AS vacancy,
    ROUND(
        CASE 
            WHEN b.capacity > 0 THEN (COUNT(sba.id)::NUMERIC / b.capacity::NUMERIC) * 100.0
            ELSE 0.0
        END, 2
    ) AS occupancy_percentage
FROM public.practical_batches b
JOIN public.academic_classes c ON b.class_id = c.id
LEFT JOIN public.profiles p_fac ON b.faculty_id = p_fac.id
LEFT JOIN public.student_batch_allocations sba ON b.id = sba.batch_id AND sba.status = 'ACTIVE'
GROUP BY b.id, b.batch_name, c.id, c.class_name, c.program_name, c.year_level, b.capacity, b.assigned_lab, b.status, p_fac.full_name;

-- 7.3 Student Class & Batch Allocation Roster View
CREATE OR REPLACE VIEW public.v_student_allocation_report AS
SELECT
    sba.id AS allocation_id,
    sba.student_id,
    p.full_name AS student_name,
    p.email AS student_email,
    p.department AS department,
    c.id AS class_id,
    c.class_name,
    c.year_level,
    c.program_name,
    b.id AS batch_id,
    b.batch_name,
    b.assigned_lab,
    sba.status AS allocation_status,
    sba.allocated_at,
    COALESCE(p_teacher.full_name, 'Unassigned') AS class_teacher_name,
    COALESCE(p_coord.full_name, 'Unassigned') AS coordinator_name
FROM public.student_batch_allocations sba
JOIN public.profiles p ON sba.student_id = p.id
JOIN public.academic_classes c ON sba.class_id = c.id
JOIN public.practical_batches b ON sba.batch_id = b.id
LEFT JOIN public.profiles p_teacher ON c.class_teacher_id = p_teacher.id
LEFT JOIN public.profiles p_coord ON c.coordinator_id = p_coord.id
WHERE sba.status = 'ACTIVE';

-- 7.4 Faculty Allocation Report View
CREATE OR REPLACE VIEW public.v_faculty_allocation_report AS
SELECT
    cfa.id AS allocation_id,
    cfa.faculty_id,
    p.full_name AS faculty_name,
    p.email AS faculty_email,
    cfa.class_id,
    c.class_name,
    cfa.batch_id,
    COALESCE(b.batch_name, 'Entire Class (Theory)') AS batch_name,
    cfa.subject_id,
    cfa.subject_name,
    cfa.allocation_type,
    cfa.created_at
FROM public.class_faculty_allocations cfa
JOIN public.profiles p ON cfa.faculty_id = p.id
JOIN public.academic_classes c ON cfa.class_id = c.id
LEFT JOIN public.practical_batches b ON cfa.batch_id = b.id;

-- ==============================================================================
-- 8. RLS POLICIES (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_faculty_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can view classes, batches, and timetables
CREATE POLICY "Public read academic_classes" ON public.academic_classes FOR SELECT USING (true);
CREATE POLICY "Public read practical_batches" ON public.practical_batches FOR SELECT USING (true);
CREATE POLICY "Public read academic_timetables" ON public.academic_timetables FOR SELECT USING (true);
CREATE POLICY "Public read student_batch_allocations" ON public.student_batch_allocations FOR SELECT USING (true);
CREATE POLICY "Public read class_faculty_allocations" ON public.class_faculty_allocations FOR SELECT USING (true);
CREATE POLICY "Public read batch_transfer_logs" ON public.batch_transfer_logs FOR SELECT USING (true);

-- Admins, Deans, and HODs have full CRUD access
CREATE POLICY "Admin full access academic_classes" ON public.academic_classes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);
CREATE POLICY "Admin full access practical_batches" ON public.practical_batches FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);
CREATE POLICY "Admin full access student_batch_allocations" ON public.student_batch_allocations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);
CREATE POLICY "Admin full access class_faculty_allocations" ON public.class_faculty_allocations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);
CREATE POLICY "Admin full access academic_timetables" ON public.academic_timetables FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod', 'faculty'))
);
CREATE POLICY "Admin full access batch_transfer_logs" ON public.batch_transfer_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'dean', 'hod'))
);

-- ==============================================================================
-- PHASE 6 CLASS & PRACTICAL BATCH MANAGEMENT SCHEMA COMPLETE
-- ==============================================================================
