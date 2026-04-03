-- ============================================================
-- COURSE MATERIALS TABLE
-- Stores modules, resources, and assignments uploaded by faculty
-- for their ERP-assigned subjects (linked via subject_allocations)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id UUID NOT NULL REFERENCES public.subject_allocations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Module', 'Resource', 'Assignment')),
    file_url TEXT,        -- Optional: Supabase Storage public URL
    deadline TIMESTAMPTZ, -- Optional: Only for Assignments
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by allocation
CREATE INDEX IF NOT EXISTS idx_materials_allocation ON public.course_materials(allocation_id);

-- Row Level Security — Faculty can only CRUD their own materials
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Faculty can read all materials tied to their allocations
CREATE POLICY "faculty_read_own_materials" ON public.course_materials
    FOR SELECT USING (
        auth.uid() = uploaded_by
        OR EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

-- Faculty can insert materials (only for their own allocations)
CREATE POLICY "faculty_insert_materials" ON public.course_materials
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by
        AND EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

-- Faculty can delete their own materials
CREATE POLICY "faculty_delete_materials" ON public.course_materials
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Admin and HOD read-all override
CREATE POLICY "admin_full_access" ON public.course_materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod')
        )
    );
