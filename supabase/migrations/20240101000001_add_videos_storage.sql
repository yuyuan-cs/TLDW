-- Create storage bucket for local videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for videos bucket
CREATE POLICY "Users can upload their own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'videos' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public = true)
  );

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
