-- ============================================================
-- STUDENT ENROLLMENTS TABLE
-- Links students to subject_allocations via subject code lookup
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES public.subject_allocations(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate enrollment to the same allocation
    CONSTRAINT uq_student_allocation UNIQUE (student_id, allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_allocation ON public.student_enrollments(allocation_id);

-- Row Level Security
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can read their own enrollments
CREATE POLICY "students_read_own" ON public.student_enrollments
    FOR SELECT USING (auth.uid() = student_id);

-- Students can enroll themselves
CREATE POLICY "students_insert_own" ON public.student_enrollments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can unenroll themselves
CREATE POLICY "students_delete_own" ON public.student_enrollments
    FOR DELETE USING (auth.uid() = student_id);

-- Faculty can see enrollments for their allocations
CREATE POLICY "faculty_read_enrollments" ON public.student_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

-- Admin/HOD full access
CREATE POLICY "admin_full_access_enrollments" ON public.student_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod')
        )
    );

-- Also allow students to READ materials for their enrolled courses
CREATE POLICY "students_read_enrolled_materials" ON public.course_materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_enrollments se
            WHERE se.allocation_id = course_materials.allocation_id
              AND se.student_id = auth.uid()
        )
    );
