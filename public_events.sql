CREATE TABLE public.public_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('student', 'faculty', 'both')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.public_events ENABLE ROW LEVEL SECURITY;

-- Everyone can read events targeted at them
CREATE POLICY "Users can view public events targeted at them" ON public.public_events
    FOR SELECT USING (
        target_audience = 'both' OR 
        (target_audience = 'student' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')) OR
        (target_audience = 'faculty' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'hod'))) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admins can insert/update/delete public events
CREATE POLICY "Admins can manage public events" ON public.public_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
