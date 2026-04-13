-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policies for proposals
CREATE POLICY "Users can view their own proposals" ON proposals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proposals" ON proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and HODs can view all proposals" ON proposals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'hod')
        )
    );

-- Storage bucket for proposals
-- (Manual step in Supabase UI or using SQL for policies)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('proposals', 'proposals', true);

-- CREATE POLICY "Proposals storage is publicly accessible for reads" ON storage.objects
--     FOR SELECT USING (bucket_id = 'proposals');

-- CREATE POLICY "Proposals storage is restricted to authenticated users for uploads" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'proposals' AND auth.role() = 'authenticated');
