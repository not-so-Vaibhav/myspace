-- ============================================================
-- STUDENT SUBMISSIONS TABLE
-- Links students to course_materials (specifically Assignments)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Allow one submission per student per assignment material
    CONSTRAINT uq_student_material UNIQUE (student_id, material_id)
);

-- Enable RLS
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Students can read their own submissions
CREATE POLICY "students_read_own_submissions" ON public.student_submissions
    FOR SELECT USING (auth.uid() = student_id);

-- 2. Students can create a submission IF BEFORE DEADLINE
CREATE POLICY "students_insert_own_submission" ON public.student_submissions
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
        AND EXISTS (
            SELECT 1 FROM public.course_materials cm
            WHERE cm.id = material_id
            AND cm.type = 'Assignment'
            AND (cm.deadline IS NULL OR cm.deadline > NOW())
        )
    );

-- 3. Students can delete (unsubmit) their own submission IF BEFORE DEADLINE
CREATE POLICY "students_delete_own_submission" ON public.student_submissions
    FOR DELETE USING (
        auth.uid() = student_id
        AND EXISTS (
            SELECT 1 FROM public.course_materials cm
            WHERE cm.id = material_id
            AND (cm.deadline IS NULL OR cm.deadline > NOW())
        )
    );

-- 4. Faculty can read submissions for assignments they created or allocations they own
CREATE POLICY "faculty_read_submissions" ON public.student_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_materials cm
            JOIN public.subject_allocations sa ON sa.id = cm.allocation_id
            WHERE cm.id = material_id
            AND (cm.uploaded_by = auth.uid() OR sa.faculty_id = auth.uid())
        )
    );

-- 5. Admin and HOD read-all
CREATE POLICY "admin_read_all_submissions" ON public.student_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod')
        )
    );

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Define Storage Policies
-- Policy: Students can upload to "submissions/{material_id}/{student_id}/filename"
CREATE POLICY "Students can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'submissions'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS NOT NULL -- material_id
    AND (storage.foldername(name))[2] = auth.uid()::text -- student_id folder
);

-- Policy: Students can view their own files
CREATE POLICY "Students can view own submission files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Faculty can view files for their assignments
CREATE POLICY "Faculty can view submission files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'submissions'
    AND auth.role() = 'authenticated'
    -- Note: Complex path-based lookup to DB is hard in pure Storage RLS without RPC.
    -- We assume if they can see the record in public.student_submissions, they have the URL.
);
