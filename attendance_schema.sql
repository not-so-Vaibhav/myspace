-- ============================================================
-- ATTENDANCE SCHEMA
-- Allows faculty to create attendance sessions for their subject allocations
-- and record student attendance.
-- ============================================================

-- Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id UUID NOT NULL REFERENCES public.subject_allocations(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_time TIME NOT NULL DEFAULT CURRENT_TIME,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session UNIQUE (allocation_id, session_date, session_time)
);

CREATE INDEX IF NOT EXISTS idx_att_sessions_allocation ON public.attendance_sessions(allocation_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_faculty ON public.attendance_sessions(faculty_id);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_record UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_att_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_records_student ON public.attendance_records(student_id);

-- RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Session Policies
CREATE POLICY "Sessions are viewable by everyone" ON public.attendance_sessions
    FOR SELECT USING (true);

CREATE POLICY "Faculty can insert attendance sessions" ON public.attendance_sessions
    FOR INSERT WITH CHECK (auth.uid() = faculty_id);

CREATE POLICY "Faculty can update their own sessions" ON public.attendance_sessions
    FOR UPDATE USING (auth.uid() = faculty_id);

CREATE POLICY "Faculty can delete their own sessions" ON public.attendance_sessions
    FOR DELETE USING (auth.uid() = faculty_id);

CREATE POLICY "Admin/HOD full access sessions" ON public.attendance_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod')
        )
    );

-- Record Policies
CREATE POLICY "Records are viewable by everyone" ON public.attendance_records
    FOR SELECT USING (true);

CREATE POLICY "Faculty can insert attendance records" ON public.attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = session_id AND s.faculty_id = auth.uid()
        )
    );

CREATE POLICY "Faculty can update attendance records" ON public.attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = session_id AND s.faculty_id = auth.uid()
        )
    );

CREATE POLICY "Admin/HOD full access records" ON public.attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod')
        )
    );
