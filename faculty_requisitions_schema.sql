-- Update letter_requests to support faculty requisitions

ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'letter' CHECK (category IN ('letter', 'requisition', 'fund'));
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Update RLS policies to allow faculty
CREATE POLICY "Faculty can view their own requisitions" ON letter_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Faculty can insert requisitions" ON letter_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
