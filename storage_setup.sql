-- Create storage bucket for requisitions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('requisitions', 'requisitions', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Requisitions Bucket
CREATE POLICY "Anyone can view requisition attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'requisitions');

CREATE POLICY "Authenticated users can upload requisition attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'requisitions' AND auth.role() = 'authenticated');
