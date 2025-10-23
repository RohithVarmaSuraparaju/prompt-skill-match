-- Create storage bucket for resume uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload resumes (public access for demo purposes)
CREATE POLICY "Allow public resume uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'resumes');

-- Allow anyone to read their uploaded resumes
CREATE POLICY "Allow public resume reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'resumes');

-- Allow anyone to delete their uploaded resumes
CREATE POLICY "Allow public resume deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'resumes');