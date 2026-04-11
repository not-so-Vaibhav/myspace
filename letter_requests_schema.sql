-- letter_requests.sql
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS letter_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    student_name TEXT NOT NULL,
    letter_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approval_date TIMESTAMP WITH TIME ZONE,
    last_printed TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS Policies
ALTER TABLE letter_requests ENABLE ROW LEVEL SECURITY;

-- Students can see their own requests
CREATE POLICY "Students can view their own letter requests" ON letter_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Students can insert their own requests
CREATE POLICY "Students can request letters" ON letter_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins/Staff/HODs can see all requests
CREATE POLICY "Admins can view all letter requests" ON letter_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'hod', 'staff', 'non_teaching')
        )
    );
